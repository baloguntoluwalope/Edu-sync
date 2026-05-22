import dotenv from 'dotenv';
dotenv.config();

const required = (key: string): string => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
};

export const env = {
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',

  MONGO_URI: required('MONGO_URI'),
  REDIS_URL: required('REDIS_URL'),

  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Brevo SMTP
  BREVO_SMTP_HOST: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
  BREVO_SMTP_PORT: parseInt(process.env.BREVO_SMTP_PORT || '587'),
  BREVO_SMTP_USER: required('BREVO_SMTP_USER'),
  BREVO_SMTP_PASS: required('BREVO_SMTP_PASS'),
  BREVO_FROM_EMAIL: required('BREVO_FROM_EMAIL'),
  BREVO_FROM_NAME: process.env.BREVO_FROM_NAME || 'EduSync',

  CLOUDINARY_CLOUD_NAME: required('CLOUDINARY_CLOUD_NAME'),
  CLOUDINARY_API_KEY: required('CLOUDINARY_API_KEY'),
  CLOUDINARY_API_SECRET: required('CLOUDINARY_API_SECRET'),

  TERMII_API_KEY: process.env.TERMII_API_KEY || '',
  TERMII_SENDER_ID: process.env.TERMII_SENDER_ID || 'EduSync',

  KORAPAY_SECRET_KEY: required('KORAPAY_SECRET_KEY'),
  KORAPAY_PUBLIC_KEY: required('KORAPAY_PUBLIC_KEY'),
  KORAPAY_WEBHOOK_SECRET: required('KORAPAY_WEBHOOK_SECRET'),
notificationUrl: required('notificationUrl'),
  

  DEFAULT_TRIAL_DAYS: parseInt(process.env.DEFAULT_TRIAL_DAYS || '180'),
  APP_NAME: process.env.APP_NAME || 'EduSync',
  APP_URL: process.env.APP_URL || 'https://edusync.ng',
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://app.edusync.ng',

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100'),
};