import mongoose, { Schema, Document } from 'mongoose';

export interface IPlatformSettings extends Document {
  logoUrl?: string;
  logoPublicId?: string;
  faviconUrl?: string;
  faviconPublicId?: string;
  platformName: string;
  supportEmail: string;
  supportPhone?: string;
  address?: string;
  tagline?: string;
  primaryColor: string;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const PlatformSettingsSchema = new Schema<IPlatformSettings>(
  {
    logoUrl: String,
    logoPublicId: String,
    faviconUrl: String,
    faviconPublicId: String,
    platformName: { type: String, default: 'EduSync' },
    supportEmail: { type: String, default: 'support@edusync.ng' },
    supportPhone: String,
    address: String,
    tagline: { type: String, default: 'Nigerian School Management Platform' },
    primaryColor: { type: String, default: '#1a56db' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const PlatformSettings = mongoose.model<IPlatformSettings>(
  'PlatformSettings',
  PlatformSettingsSchema
);