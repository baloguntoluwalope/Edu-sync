import mongoose, { Schema, Document } from 'mongoose';

export type StaffRole =
  | 'non_teaching'
  | 'bursar'
  | 'librarian'
  | 'security'
  | 'cleaner'
  | 'driver'
  | 'cook'
  | 'nurse'
  | 'counselor'
  | 'it_support'
  | 'other';

export interface IStaff extends Document {
  schoolId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;

  // Identity
  firstName: string;
  lastName: string;
  middleName?: string;
  gender: 'male' | 'female';
  dateOfBirth?: Date;
  religion?: string;
  nationality: string;
  stateOfOrigin?: string;
  lgaOfOrigin?: string;

  // Contact
  email?: string;
  phone: string;
  homeAddress: string;
  city: string;
  state: string;

  // Employment
  staffId: string;
  staffRole: StaffRole;
  customRole?: string;
  department?: string;
  qualification?: string;
  dateEmployed: Date;
  isActive: boolean;

  // Emergency
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;

  // Photo
  passportUrl?: string;
  passportPublicId?: string;

  // QR code for attendance
  qrCodeData: string;
  qrCodeUrl?: string;

  createdAt: Date;
  updatedAt: Date;
}

const StaffSchema = new Schema<IStaff>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },

    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true },
    gender: { type: String, enum: ['male', 'female'], required: true },
    dateOfBirth: Date,
    religion: String,
    nationality: { type: String, default: 'Nigerian' },
    stateOfOrigin: String,
    lgaOfOrigin: String,

    email: { type: String, lowercase: true, trim: true, sparse: true },
    phone: { type: String, required: true, trim: true },
    homeAddress: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },

    staffId: { type: String, required: true, unique: true, trim: true },
    staffRole: {
      type: String,
      enum: [
        'non_teaching', 'bursar', 'librarian', 'security',
        'cleaner', 'driver', 'cook', 'nurse', 'counselor',
        'it_support', 'other',
      ],
      required: true,
    },
    customRole: String,
    department: String,
    qualification: String,
    dateEmployed: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },

    emergencyContactName: { type: String, required: true },
    emergencyContactPhone: { type: String, required: true },
    emergencyContactRelationship: { type: String, required: true },

    passportUrl: String,
    passportPublicId: String,

    qrCodeData: { type: String, required: true },
    qrCodeUrl: String,
  },
  { timestamps: true }
);

StaffSchema.index({ schoolId: 1, branchId: 1, staffRole: 1 });
StaffSchema.index({ schoolId: 1, phone: 1 }, { unique: true, sparse: true });
StaffSchema.index({ schoolId: 1, email: 1 }, { unique: true, sparse: true });

export const Staff = mongoose.model<IStaff>('Staff', StaffSchema);