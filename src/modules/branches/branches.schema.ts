import { z } from 'zod';

export const createBranchSchema = z.object({
  name: z.string().min(2).max(100),
  address: z.string().min(5).max(200),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  principalName: z.string().optional(),
  whatsappGroupLink: z.string().url().optional(),
});

export const updateBranchSchema = createBranchSchema.partial();