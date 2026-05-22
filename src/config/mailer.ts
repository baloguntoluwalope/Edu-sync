import axios from 'axios';
import { env } from './env';
import { logger } from './logger';

const BREVO_API_BASE = 'https://api.brevo.com/v3';

export const verifyMailer = async (): Promise<void> => {
  try {
    const res = await axios.get(`${BREVO_API_BASE}/account`, {
      headers: { 'api-key': env.BREVO_API_KEY },
    });
    const email = res?.data?.email;
    logger.info(`✅ Brevo API connected — account: ${email ?? 'unknown'}`);
  } catch (err) {
    logger.error('❌ Brevo API connection failed:', err);
  }
};

export const sendEmail = async (
  to: string | string[],
  subject: string,
  html: string,
  replyTo?: string
): Promise<boolean> => {
  try {
    const recipients = (Array.isArray(to) ? to : [to]).map((email) => ({ email }));

    const payload = {
      sender: { name: env.BREVO_FROM_NAME, email: env.BREVO_FROM_EMAIL },
      to: recipients,
      subject,
      htmlContent: html,
      replyTo: { email: replyTo ?? env.BREVO_FROM_EMAIL },
    };

    await axios.post(`${BREVO_API_BASE}/smtp/email`, payload, {
      headers: {
        'api-key': env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    logger.info(`✉️  Email sent → ${Array.isArray(to) ? to.join(', ') : to} | ${subject}`);
    return true;
  } catch (err) {
    logger.error(`❌ Email failed → ${to} | ${subject}`, err);
    return false;
  }
};