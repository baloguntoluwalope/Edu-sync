import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../../config/env';
import { Notification } from '../../shared/models/Notification';

const connection = new Redis(env.REDIS_URL);
const notifyQueue = new Queue('notification-queue', { connection });

export const sendNotification = async (payload: any): Promise<void> => {
  // Push the work to the background queue
  await notifyQueue.add('dispatch-notification', payload, {
    attempts: 3, // Retry 3 times if Termii or SendGrid is down
    backoff: {
      type: 'exponential',
      delay: 5000, // Wait 5s, then 10s, then 20s...
    },
    removeOnComplete: true, 
  });
};

export const getMyNotifications = async (
  userId: string,
  schoolId: string,
  page = 1,
  limit = 20
) => {
  const skip = (page - 1) * limit;
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find({ recipientId: userId, schoolId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(), // Use lean for better read performance
    Notification.countDocuments({ recipientId: userId, schoolId }),
    Notification.countDocuments({ recipientId: userId, schoolId, isRead: false }),
  ]);
  return { notifications, total, unreadCount };
};

export const markAllRead = async (userId: string, schoolId: string): Promise<void> => {
  await Notification.updateMany(
    { recipientId: userId, schoolId, isRead: false },
    { isRead: true }
  );
};