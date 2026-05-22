import { z } from 'zod';

export const updateSchoolSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().min(10).max(15).optional(),
  address: z.string().min(5).max(200).optional(),
  website: z.string().url().optional(),
});

export const updateNotificationPrefsSchema = z.object({
  email: z.boolean().optional(),
  inApp: z.boolean().optional(),
  sms: z.boolean().optional(),
});