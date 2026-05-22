import nodemailer from 'nodemailer';
import { env } from './env';
import { logger } from './logger';

export const transporter = nodemailer.createTransport({
  host: env.BREVO_SMTP_HOST,
  port: env.BREVO_SMTP_PORT,
  secure: false, // TLS on port 587
  auth: {
    user: env.BREVO_SMTP_USER,
    pass: env.BREVO_SMTP_PASS,
  },
  pool: true,         // reuse connections
  maxConnections: 5,
  maxMessages: 100,
});

// Verify connection on startup
export const verifyMailer = async (): Promise<void> => {
  try {
    await transporter.verify();
    logger.info('✅ Brevo SMTP connected');
  } catch (err) {
    logger.error('❌ Brevo SMTP connection failed:', err);
  }
};

export const sendEmail = async (
  to: string | string[],
  subject: string,
  html: string,
  replyTo?: string
): Promise<boolean> => {
  try {
    await transporter.sendMail({
      from: `"${env.BREVO_FROM_NAME}" <${env.BREVO_FROM_EMAIL}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      replyTo: replyTo || env.BREVO_FROM_EMAIL,
    });
    logger.info(`✉️  Email sent → ${Array.isArray(to) ? to.join(', ') : to} | ${subject}`);
    return true;
  } catch (err) {
    logger.error(`❌ Email failed → ${to} | ${subject}`, err);
    return false;
  }
};