import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '../utils/jwt';

export interface IUser extends Document {
  schoolId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  parentId?: mongoose.Types.ObjectId;
  role: UserRole;
  qrCodeData?: string;
qrCodeUrl?: string;
 

  // ─── Basic Info ────────────────────────────────────────────────────
  firstName: string;
  lastName: string;
  middleName?: string;
  email?: string;
  phone?: string;
  gender?: 'male' | 'female';
  dateOfBirth?: Date;
  religion?: string;
  nationality?: string;
  stateOfOrigin?: string;
  lgaOfOrigin?: string;
   
   

  // ─── Student Specific ──────────────────────────────────────────────
  admissionNumber?: string;
  admissionDate?: Date;
  classId?: mongoose.Types.ObjectId;

  // Student address
  homeAddress?: string;
  city?: string;
  state?: string;

  // Medical info
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  genotype?: 'AA' | 'AS' | 'SS' | 'AC' | 'SC';
  medicalConditions?: string;
  allergies?: string;

  // Emergency contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;

  // Previous school
  previousSchoolName?: string;
  previousSchoolAddress?: string;
  previousClass?: string;
  reasonForLeaving?: string;

  // Profile photo (passport)
  passportUrl?: string;
  passportPublicId?: string;

  // ─── Staff Specific ────────────────────────────────────────────────
  staffId?: string;
  qualification?: string;
  specialization?: string;
  yearsOfExperience?: number;
  profileImageUrl?: string;
  profileImagePublicId?: string;

  // ─── Auth & Account ────────────────────────────────────────────────
  passwordHash?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  linkedStudents: mongoose.Types.ObjectId[];

  notificationPrefs: {
    email: boolean;
    inApp: boolean;
    sms: boolean;
  };

  lastLoginAt?: Date;
  passwordChangedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    role: {
      type: String,
      enum: ['superadmin', 'schooladmin', 'teacher', 'student', 'parent'],
      required: true,
    },

    // ─── Basic Info ────────────────────────────────────────────────────
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true, sparse: true },
    phone: { type: String, trim: true, sparse: true },
    gender: { type: String, enum: ['male', 'female'] },
    dateOfBirth: { type: Date },
    religion: { type: String, trim: true },
    nationality: { type: String, trim: true, default: 'Nigerian' },
    stateOfOrigin: { type: String, trim: true },
    lgaOfOrigin: { type: String, trim: true },

    // ─── Student Specific ──────────────────────────────────────────────
    admissionNumber: { type: String, trim: true, sparse: true },
    admissionDate: { type: Date },
    classId: { type: Schema.Types.ObjectId, ref: 'Class' },
    homeAddress: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    
     qrCodeData: { type: String, sparse: true },
qrCodeUrl: { type: String },

    // Medical
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    genotype: {
      type: String,
      enum: ['AA', 'AS', 'SS', 'AC', 'SC'],
    },
    medicalConditions: { type: String, trim: true },
    allergies: { type: String, trim: true },

    // Emergency contact
    emergencyContactName: { type: String, trim: true },
    emergencyContactPhone: { type: String, trim: true },
    emergencyContactRelationship: { type: String, trim: true },

    // Previous school
    previousSchoolName: { type: String, trim: true },
    previousSchoolAddress: { type: String, trim: true },
    previousClass: { type: String, trim: true },
    reasonForLeaving: { type: String, trim: true },

    // Passport
    passportUrl: { type: String },
    passportPublicId: { type: String },

    // ─── Staff Specific ────────────────────────────────────────────────
    staffId: { type: String, trim: true, sparse: true },
    qualification: { type: String, trim: true },
    specialization: { type: String, trim: true },
    yearsOfExperience: { type: Number },
    profileImageUrl: { type: String },
    profileImagePublicId: { type: String },

    // ─── Auth & Account ────────────────────────────────────────────────
    passwordHash: { type: String, select: false },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    linkedStudents: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    notificationPrefs: {
      email: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
    },

    lastLoginAt: { type: Date },
    passwordChangedAt: { type: Date },
  },
  { timestamps: true }
);

UserSchema.index({ schoolId: 1, branchId: 1, role: 1 });
UserSchema.index({ schoolId: 1, admissionNumber: 1 }, { unique: true, sparse: true });
UserSchema.index({ schoolId: 1, email: 1 }, { unique: true, sparse: true });
UserSchema.index({ schoolId: 1, phone: 1 }, { unique: true, sparse: true });
UserSchema.index({ schoolId: 1, staffId: 1 }, { unique: true, sparse: true });

export const User = mongoose.model<IUser>('User', UserSchema);