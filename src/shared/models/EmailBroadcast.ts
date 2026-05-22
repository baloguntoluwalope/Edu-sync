import mongoose, { Schema, Document } from 'mongoose';

export type BroadcastTarget =
  | 'all_schools'
  | 'active_schools'
  | 'trial_schools'
  | 'expired_schools'
  | 'specific_schools'
  | 'all_admins'
  | 'all_teachers'
  | 'all_parents';

export interface IEmailBroadcast extends Document {
  subject: string;
  bodyHtml: string;
  target: BroadcastTarget;
  targetSchoolIds?: mongoose.Types.ObjectId[];
  sentBy: mongoose.Types.ObjectId;
  templateId?: mongoose.Types.ObjectId;
  totalRecipients: number;
  successCount: number;
  failCount: number;
  status: 'pending' | 'sending' | 'completed' | 'failed';
  sentAt?: Date;
  createdAt: Date;
}

const EmailBroadcastSchema = new Schema<IEmailBroadcast>(
  {
    subject: { type: String, required: true },
    bodyHtml: { type: String, required: true },
    target: {
      type: String,
      enum: [
        'all_schools', 'active_schools', 'trial_schools',
        'expired_schools', 'specific_schools', 'all_admins',
        'all_teachers', 'all_parents',
      ],
      required: true,
    },
    targetSchoolIds: [{ type: Schema.Types.ObjectId, ref: 'School' }],
    sentBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'EmailTemplate' },
    totalRecipients: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'sending', 'completed', 'failed'],
      default: 'pending',
    },
    sentAt: Date,
  },
  { timestamps: true }
);

export const EmailBroadcast = mongoose.model<IEmailBroadcast>('EmailBroadcast', EmailBroadcastSchema);