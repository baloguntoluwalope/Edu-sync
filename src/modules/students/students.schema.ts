import { z } from 'zod';

export const createStudentSchema = z.object({
  // ─── Compulsory ───────────────────────────────────────────────────────────
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  middleName: z.string().max(50).optional(),
  gender: z.enum(['male', 'female'] as const),
  dateOfBirth: z.string().nonempty('Date of birth is required'),
  classId: z.string().length(24, 'Valid class is required'),
  admissionDate: z.string().optional(),

  // ─── Contact & Location ────────────────────────────────────────────────────
  homeAddress: z.string().min(5, 'Home address is required').max(300),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  nationality: z.string().max(50).default('Nigerian'),
  stateOfOrigin: z.string().max(50).optional(),
  lgaOfOrigin: z.string().max(50).optional(),
  religion: z.string().max(50).optional(),

  // ─── Medical (compulsory for school records) ───────────────────────────────
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const).optional(),
  genotype: z.enum(['AA', 'AS', 'SS', 'AC', 'SC'] as const).optional(),
  medicalConditions: z.string().max(300).optional(),
  allergies: z.string().max(300).optional(),

  // ─── Emergency Contact (compulsory) ───────────────────────────────────────
  emergencyContactName: z.string().min(2, 'Emergency contact name is required').max(100),
  emergencyContactPhone: z.string().min(10, 'Emergency contact phone is required').max(15),
  emergencyContactRelationship: z.string().min(2, 'Relationship is required').max(50),

  // ─── Parent / Guardian ────────────────────────────────────────────────────
  parentFirstName: z.string().min(1, 'Parent first name is required').max(50),
  parentLastName: z.string().min(1, 'Parent last name is required').max(50),
  parentPhone: z.string().min(10, 'Parent phone is required').max(15),
  parentEmail: z.string().email().optional(),
  parentGender: z.enum(['male', 'female'] as const).optional(),
  parentRelationship: z.enum(['father', 'mother', 'guardian'] as const).default('guardian'),
  parentOccupation: z.string().max(100).optional(),
  parentAddress: z.string().max(300).optional(),

  // ─── Previous School ──────────────────────────────────────────────────────
  previousSchoolName: z.string().max(150).optional(),
  previousSchoolAddress: z.string().max(300).optional(),
  previousClass: z.string().max(50).optional(),
  reasonForLeaving: z.string().max(300).optional(),
});

export const updateStudentSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  middleName: z.string().max(50).optional(),
  dateOfBirth: z.string().optional(),
  homeAddress: z.string().min(5).max(300).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  nationality: z.string().max(50).optional(),
  stateOfOrigin: z.string().max(50).optional(),
  lgaOfOrigin: z.string().max(50).optional(),
  religion: z.string().max(50).optional(),
  gender: z.enum(['male', 'female'] as const).optional(),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const).optional(),
  genotype: z.enum(['AA', 'AS', 'SS', 'AC', 'SC'] as const).optional(),
  medicalConditions: z.string().max(300).optional(),
  allergies: z.string().max(300).optional(),
  emergencyContactName: z.string().max(100).optional(),
  emergencyContactPhone: z.string().max(15).optional(),
  emergencyContactRelationship: z.string().max(50).optional(),
  previousSchoolName: z.string().max(150).optional(),
  previousSchoolAddress: z.string().max(300).optional(),
  previousClass: z.string().max(50).optional(),
  reasonForLeaving: z.string().max(300).optional(),
  classId: z.string().length(24).optional(),
});