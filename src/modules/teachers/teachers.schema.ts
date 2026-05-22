import { z } from 'zod';

export const createTeacherSchema = z.object({
  // ─── Compulsory ───────────────────────────────────────────────────────────
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  middleName: z.string().max(50).optional(),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Phone number is required').max(15),
  gender: z.enum(['male', 'female']),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(64),

  // ─── Address ──────────────────────────────────────────────────────────────
  homeAddress: z.string().min(5, 'Address is required').max(300),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  nationality: z.string().max(50).default('Nigerian'),
  stateOfOrigin: z.string().max(50).optional(),
  lgaOfOrigin: z.string().max(50).optional(),
  religion: z.string().max(50).optional(),

  // ─── Professional ─────────────────────────────────────────────────────────
  qualification: z.string().min(1, 'Qualification is required').max(100),
  specialization: z.string().max(100).optional(),
  yearsOfExperience: z.number().min(0).max(50).optional(),

  // ─── Assignments ──────────────────────────────────────────────────────────
  assignedClassIds: z.array(z.string().length(24)).optional(),
  assignedSubjectIds: z.array(z.string().length(24)).optional(),
});

export const updateTeacherSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  middleName: z.string().max(50).optional(),
  phone: z.string().min(10).max(15).optional(),
  gender: z.enum(['male', 'female']).optional(),
  dateOfBirth: z.string().optional(),
  homeAddress: z.string().min(5).max(300).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  nationality: z.string().max(50).optional(),
  stateOfOrigin: z.string().max(50).optional(),
  lgaOfOrigin: z.string().max(50).optional(),
  religion: z.string().max(50).optional(),
  qualification: z.string().max(100).optional(),
  specialization: z.string().max(100).optional(),
  yearsOfExperience: z.number().min(0).max(50).optional(),
  isActive: z.boolean().optional(),
});

export const assignClassSchema = z.object({
  teacherId: z.string().length(24),
  classIds: z.array(z.string().length(24)).min(1),
});

export const assignSubjectSchema = z.object({
  teacherId: z.string().length(24),
  subjectIds: z.array(z.string().length(24)).min(1),
});