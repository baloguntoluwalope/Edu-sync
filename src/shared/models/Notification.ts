import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType =
  | 'attendance' | 'cbt' | 'result' | 'assignment'
  | 'resource' | 'community' | 'subscription' | 'general';

export interface INotification extends Document {
  schoolId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  recipientId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  channels: ('email' | 'inApp' | 'sms')[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['attendance', 'cbt', 'result', 'assignment', 'resource', 'community', 'subscription', 'general'],
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    channels: [{ type: String, enum: ['email', 'inApp', 'sms'] }],
    metadata: Schema.Types.Mixed,
  },
  { timestamps: true }
);

NotificationSchema.index({ schoolId: 1, recipientId: 1, isRead: 1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);