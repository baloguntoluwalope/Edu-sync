import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string().min(3).max(150),
  body: z.string().min(5).max(5000),
  type: z.enum(['news', 'event', 'discussion']),
  whatsappLink: z.string().url().optional(),
  eventDate: z.string().optional(),
});

export const updatePostSchema = z.object({
  title: z.string().min(3).max(150).optional(),
  body: z.string().min(5).max(5000).optional(),
  whatsappLink: z.string().url().optional(),
  eventDate: z.string().optional(),
  isPinned: z.boolean().optional(),
});