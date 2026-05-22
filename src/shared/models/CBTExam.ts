import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion {
  _id?: mongoose.Types.ObjectId;
  text: string;
  options: string[];
  correctIndex: number;
  marks: number;
  imageUrl?: string;
}

export interface ICBTExam extends Document {
  schoolId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  title: string;
  instructions?: string;
  term: string;
  session: string;
  durationMinutes: number;
  questions: IQuestion[];
  shuffleQuestions: boolean;
  isPublished: boolean;
  offlineAvailable: boolean;
  startsAt?: Date;
  endsAt?: Date;
}

const QuestionSchema = new Schema<IQuestion>({
  text: { type: String, required: true },
  options: [{ type: String }],
  correctIndex: { type: Number, required: true },
  marks: { type: Number, default: 1 },
  imageUrl: String,
});

const CBTExamSchema = new Schema<ICBTExam>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    instructions: String,
    term: String,
    session: String,
    durationMinutes: { type: Number, default: 40 },
    questions: [QuestionSchema],
    shuffleQuestions: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },
    offlineAvailable: { type: Boolean, default: false },
    startsAt: Date,
    endsAt: Date,
  },
  { timestamps: true }
);

export const CBTExam = mongoose.model<ICBTExam>('CBTExam', CBTExamSchema);