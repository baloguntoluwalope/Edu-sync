import mongoose, { Schema, Document } from 'mongoose';

export interface ISubmission extends Document {
  schoolId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  resourceId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  fileUrl?: string;
  filePublicId?: string;
  note?: string;
  status: 'pending' | 'submitted' | 'graded';
  grade?: number;
  feedback?: string;
  submittedAt?: Date;
  synced: boolean;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    resourceId: { type: Schema.Types.ObjectId, ref: 'Resource', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fileUrl: String,
    filePublicId: String,
    note: String,
    status: { type: String, enum: ['pending', 'submitted', 'graded'], default: 'pending' },
    grade: Number,
    feedback: String,
    submittedAt: Date,
    synced: { type: Boolean, default: true },
  },
  { timestamps: true }
);

SubmissionSchema.index({ resourceId: 1, studentId: 1 }, { unique: true });

export const Submission = mongoose.model<ISubmission>('Submission', SubmissionSchema);