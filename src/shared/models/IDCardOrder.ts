import mongoose, { Schema, Document } from 'mongoose';

export type IDCardType = 'student' | 'teacher' | 'staff' | 'admin';

export interface IIDCardItem {
  attendeeId: string;
  attendeeType: IDCardType;
  name: string;
  identifier: string;
  qrCodeUrl: string;
  passportUrl?: string;
  className?: string;
  role?: string;
}

export interface IIDCardOrder extends Document {
  schoolId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  orderedBy: mongoose.Types.ObjectId;
  items: IIDCardItem[];
  totalCards: number;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const IDCardItemSchema = new Schema<IIDCardItem>(
  {
    attendeeId: { type: String, required: true },
    attendeeType: {
      type: String,
      enum: ['student', 'teacher', 'staff', 'admin'],
      required: true,
    },
    name: { type: String, required: true },
    identifier: { type: String, required: true },
    qrCodeUrl: { type: String, required: true },
    passportUrl: String,
    className: String,
    role: String,
  },
  { _id: false }
);

const IDCardOrderSchema = new Schema<IIDCardOrder>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    orderedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [IDCardItemSchema],
    totalCards: { type: Number, required: true },
    downloadCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

IDCardOrderSchema.index({ schoolId: 1, branchId: 1, createdAt: -1 });

export const IDCardOrder = mongoose.model<IIDCardOrder>(
  'IDCardOrder',
  IDCardOrderSchema
);