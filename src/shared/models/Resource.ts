import mongoose, { Schema, Document } from 'mongoose';

export interface IResource extends Document {
  schoolId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  subjectId?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  fileUrl?: string;
  filePublicId?: string;
  fileType?: 'pdf' | 'doc' | 'video' | 'link' | 'image' | 'other';
  externalLink?: string;
  isAssignment: boolean;
  deadline?: Date;
  targetStudentIds: mongoose.Types.ObjectId[];
}

const ResourceSchema = new Schema<IResource>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
    title: { type: String, required: true, trim: true },
    description: String,
    fileUrl: String,
    filePublicId: String,
    fileType: { type: String, enum: ['pdf', 'doc', 'video', 'link', 'image', 'other'] },
    externalLink: String,
    isAssignment: { type: Boolean, default: false },
    deadline: Date,
    targetStudentIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export const Resource = mongoose.model<IResource>('Resource', ResourceSchema);