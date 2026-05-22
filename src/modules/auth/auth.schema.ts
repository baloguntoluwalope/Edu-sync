import { z } from 'zod';

export const registerSchoolSchema = z.object({
  schoolName: z.string().min(2, 'School name is required').max(100),
  branchName: z.string().min(2).max(100).default('Main Branch'),
  branchAddress: z.string().min(5, 'Branch address is required').max(200),
  adminEmail: z.string().email('Valid email is required').transform((v) => v.toLowerCase().trim()),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters').max(64),
  adminFirstName: z.string().min(1, 'First name is required').max(50).transform((v) => v.trim()),
  adminLastName: z.string().min(1, 'Last name is required').max(50).transform((v) => v.trim()),
  phone: z.string().min(10).max(15).optional(),
});

export const loginEmailSchema = z.object({
  email: z
    .string().min(1, 'Email is required')
    .email('Please enter a valid email address')
    .transform((v) => v.toLowerCase().trim()),
  password: z
    .string().min(1, 'Password is required'),
});

export const loginStudentSchema = z.object({
  schoolId: z.string().length(24, 'Valid school ID is required'),
  branchId: z.string().length(24, 'Valid branch ID is required'),
  admissionNumber: z
    .string().min(1, 'Admission number is required')
    .transform((v) => v.trim().toUpperCase()),
  lastName: z
    .string().min(1, 'Last name is required')
    .transform((v) => v.trim()),
});

export const loginParentSchema = z.object({
  schoolId: z.string().length(24, 'Valid school ID is required'),
  branchId: z.string().length(24, 'Valid branch ID is required'),
  phone: z
    .string().min(10, 'Valid phone number is required')
    .max(15)
    .transform((v) => v.trim()),
  surname: z
    .string().min(1, 'Surname is required')
    .transform((v) => v.trim()),
});