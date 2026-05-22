import mongoose, { Schema, Document } from 'mongoose';

export interface ISchool extends Document {
  name: string;
  slug: string;
  email: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  logoPublicId?: string;
  principalSignatureUrl?: string;
  principalSignaturePublicId?: string;
  website?: string;
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'suspended';
  trialEndsAt: Date;
  subscriptionEndsAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SchoolSchema = new Schema<ISchool>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true, index: true },
    email: { type: String, unique: true, lowercase: true, required: true },
    phone: { type: String, trim: true },
    address: String,
    logoUrl: String,
    logoPublicId: String,
    principalSignatureUrl : String,
    principalSignaturePublicId: String,
    website: String,
    subscriptionStatus: {
      type: String,
      enum: ['trial', 'active', 'expired', 'suspended'],
      default: 'trial',
    },
    trialEndsAt: { type: Date, required: true },
    subscriptionEndsAt: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const School = mongoose.model<ISchool>('School', SchoolSchema);