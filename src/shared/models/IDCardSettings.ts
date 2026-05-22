import mongoose, { Schema, Document } from 'mongoose';

export interface IIDCardSettings extends Document {
  // null schoolId = platform-wide default set by superadmin
  schoolId?: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  pricePerCard: number;
  isFree: boolean;
  isPlatformDefault: boolean;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const IDCardSettingsSchema = new Schema<IIDCardSettings>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', sparse: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', sparse: true },
    pricePerCard: { type: Number, default: 0, min: 0 },
    isFree: { type: Boolean, default: true },
    isPlatformDefault: { type: Boolean, default: false },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

IDCardSettingsSchema.index({ schoolId: 1, branchId: 1 }, { unique: true, sparse: true });
IDCardSettingsSchema.index({ isPlatformDefault: 1 });

export const IDCardSettings = mongoose.model<IIDCardSettings>(
  'IDCardSettings',
  IDCardSettingsSchema
);