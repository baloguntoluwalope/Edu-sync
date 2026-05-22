import mongoose, { Schema, Document } from 'mongoose';

export interface ICBTSubmission extends Document {
  schoolId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  examId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  answers: Map<string, number>;
  score: number;
  totalMarks: number;
  percentage: number;
  submittedAt: Date;
  synced: boolean;
  offlineId?: string;
  timeTakenSeconds?: number;
}

const CBTSubmissionSchema = new Schema<ICBTSubmission>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    examId: { type: Schema.Types.ObjectId, ref: 'CBTExam', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    answers: { type: Map, of: Number, default: {} },
    score: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    submittedAt: { type: Date, default: Date.now },
    synced: { type: Boolean, default: true },
    offlineId: { type: String, sparse: true },
    timeTakenSeconds: Number,
  },
  { timestamps: true }
);

CBTSubmissionSchema.index({ examId: 1, studentId: 1 }, { unique: true });

export const CBTSubmission = mongoose.model<ICBTSubmission>('CBTSubmission', CBTSubmissionSchema);