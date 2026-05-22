import { Worker, Job } from 'bullmq';
import axios from 'axios';
import Redis from 'ioredis';
import { env } from '../../config/env';
import { Notification } from '../../shared/models/Notification';
import { User } from '../../shared/models/User';
import { sendEmail } from '../../shared/utils/emailTemplates';
import { logger } from '../../config/logger';

const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

export const notificationWorker = new Worker(
  'notification-queue',
  async (job: Job) => {
    const payload = job.data;

    try {
      // 1. Idempotency Check (Prevent duplicate SMS/Emails if job retries)
      const lockKey = `notif_lock:${job.id || payload.recipientId + payload.type + payload.title}`;
      const isProcessing = await connection.get(lockKey);
      if (isProcessing) {
        logger.warn(`Duplicate notification job detected for ${payload.recipientId}. Skipping.`);
        return;
      }
      // Lock for 10 minutes
      await connection.set(lockKey, 'locked', 'EX', 600);

      // 2. Fetch user and preferences
      const user = await User.findById(payload.recipientId).select(
        'email phone notificationPrefs firstName isActive'
      );
      
      if (!user || !user.isActive) return;

      const channels: string[] = ['inApp'];

      // 3. Create the Database Record (In-App)
      const notif = await Notification.create({
        schoolId: payload.schoolId,
        branchId: payload.branchId,
        recipientId: payload.recipientId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        isRead: false,
        channels: ['inApp'],
        metadata: payload.metadata,
      });

      // 4. Handle Email Dispatch
      if (user.notificationPrefs?.email && user.email && payload.emailHtml) {
        const sent = await sendEmail(
          user.email,
          payload.emailSubject || payload.title,
          payload.emailHtml
        );
        if (sent) channels.push('email');
      }

      // 5. Handle Termii SMS Dispatch
      if (user.notificationPrefs?.sms && user.phone) {
        const termiiResponse = await axios.post('https://api.ng.termii.com/api/sms/send', {
          to: user.phone,
          from: env.TERMII_SENDER_ID,
          sms: payload.body,
          type: 'plain',
          channel: 'generic',
          api_key: env.TERMII_API_KEY,
        });
        
        channels.push('sms');
        
        // Save Termii Message ID for tracking delivery reports later
        if (termiiResponse.data?.message_id) {
          await Notification.findByIdAndUpdate(notif._id, {
            $set: { 'metadata.termiiMessageId': termiiResponse.data.message_id }
          });
        }
      }

      logger.info(`Notification sent to ${user._id} via [${channels.join(', ')}]`);

    } catch (error: any) {
      logger.error(`Notification Worker Error: ${error.message}`);
      // If it's a Termii rate limit error, throw to trigger BullMQ retry
      throw error; 
    }
  },
  { 
    connection,
    // Rate Limiting: Limit to 10 notifications per second to avoid API blocks
    limiter: {
      max: 10,
      duration: 1000
    }
  }
);

notificationWorker.on('completed', (job) => {
  logger.info(`Notification Job Completed: ${job.id}`);
});

notificationWorker.on('failed', (job, err) => {
  logger.error(`Notification Job Failed: ${job?.id} - ${err.message}`);
});