import mongoose, { Schema, Document } from 'mongoose';

export interface IClass extends Document {
  schoolId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  name: string;
category: 'KG' | 'NURSERY' | 'PRIMARY' | 'JSS' | 'SSS';
  formTeacherId?: mongoose.Types.ObjectId;
  studentIds: mongoose.Types.ObjectId[];
  isActive: boolean;
}

const ClassSchema = new Schema<IClass>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: ['KG', 'NURSERY', 'PRIMARY', 'JSS', 'SSS'] },
    formTeacherId: { type: Schema.Types.ObjectId, ref: 'User' },
    studentIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ClassSchema.index({ schoolId: 1, branchId: 1, name: 1 });

export const Class = mongoose.model<IClass>('Class', ClassSchema);