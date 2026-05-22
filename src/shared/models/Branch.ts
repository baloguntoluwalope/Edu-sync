import mongoose, { Schema, Document } from 'mongoose';

export interface IBranch extends Document {
  schoolId: mongoose.Types.ObjectId;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string
  logoUrl?: string;
  logoPublicId?: string;
  principalName?: string;
  principalSignatureUrl?: string;
  principalSignaturePublicId?: string;
  whatsappGroupLink?: string;
  isMainBranch: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema = new Schema<IBranch>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    phone: String,
    email: { type: String, lowercase: true },
    logoUrl: String,
    logoPublicId: String,
    principalName: String,
    principalSignatureUrl: String,
    principalSignaturePublicId: String,
    whatsappGroupLink: String,
    isMainBranch: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

BranchSchema.index({ schoolId: 1, name: 1 });

export const Branch = mongoose.model<IBranch>('Branch', BranchSchema);