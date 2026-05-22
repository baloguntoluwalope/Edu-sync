import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  schoolId?: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  actorId?: mongoose.Types.ObjectId;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: String,
    metadata: Schema.Types.Mixed,
    ip: String,
  },
  { timestamps: true }
);

AuditLogSchema.index({ schoolId: 1, createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);