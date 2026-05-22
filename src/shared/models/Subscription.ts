import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription extends Document {
  schoolId: mongoose.Types.ObjectId;
  plan: 'monthly' | 'termly' | 'annual';
  amountNaira: number;
  paymentRef: string;
  status: 'pending' | 'paid' | 'failed';
  paidAt?: Date;
  expiresAt?: Date;
  provider: string;
  initiatedBy?: mongoose.Types.ObjectId;
  auditLog: { action: string; by?: mongoose.Types.ObjectId; at: Date }[];
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    plan: { type: String, enum: ['monthly', 'termly', 'annual'] },
    amountNaira: Number,
    paymentRef: { type: String, unique: true },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    paidAt: Date,
    expiresAt: Date,
    provider: { type: String, default: 'korapay' },
    initiatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    auditLog: [
      {
        action: String,
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const Subscription = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);