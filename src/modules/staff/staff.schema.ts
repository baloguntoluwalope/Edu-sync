import { z } from 'zod';

export const createStaffSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  middleName: z.string().max(50).optional(),
  gender: z.enum(['male', 'female']),
  dateOfBirth: z.string().optional(),
  religion: z.string().max(50).optional(),
  nationality: z.string().max(50).default('Nigerian'),
  stateOfOrigin: z.string().max(50).optional(),
  lgaOfOrigin: z.string().max(50).optional(),

  email: z.string().email().optional(),
  phone: z.string().min(10).max(15),
  homeAddress: z.string().min(5).max(300),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),

  staffRole: z.enum([
    'non_teaching', 'bursar', 'librarian', 'security',
    'cleaner', 'driver', 'cook', 'nurse', 'counselor',
    'it_support', 'other',
  ]),
  customRole: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  qualification: z.string().max(150).optional(),
  dateEmployed: z.string().optional(),

  emergencyContactName: z.string().min(2).max(100),
  emergencyContactPhone: z.string().min(10).max(15),
  emergencyContactRelationship: z.string().min(2).max(50),
});

export const updateStaffSchema = createStaffSchema.partial();