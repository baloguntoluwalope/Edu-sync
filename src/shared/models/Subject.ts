import mongoose, { Schema, Document } from 'mongoose';

export interface ISubject extends Document {
  schoolId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  name: string;
  category: string; // Added: e.g., 'PRIMARY', 'JSS', 'Science', 'Trade'
  code?: string;    // e.g., MTH 101
  isDefault: boolean;
  teacherId?: mongoose.Types.ObjectId;
  isActive: boolean;
}

const SubjectSchema = new Schema<ISubject>(
  {
    schoolId: { 
      type: Schema.Types.ObjectId, 
      ref: 'School', 
      required: true, 
      index: true 
    },
    branchId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Branch', 
      required: true, 
      index: true 
    },
    classId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Class', 
      required: true, 
      index: true 
    },
    name: { 
      type: String, 
      required: true, 
      trim: true 
    },
    category: { 
      type: String, 
      required: true,
      index: true,
      // Helps group subjects on result sheets (e.g., 'Trade Subjects', 'Core Subjects')
    },
    code: { 
      type: String, 
      trim: true 
    },
    isDefault: { 
      type: Boolean, 
      default: false 
    },
    teacherId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User' 
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
  },
  { timestamps: true }
);

/**
 * UNIQUE INDEX: Prevents duplicate subjects within the same class/branch.
 * This is vital for data integrity during bulk onboarding.
 */
SubjectSchema.index(
  { schoolId: 1, branchId: 1, classId: 1, name: 1 }, 
  { unique: true }
);

export const Subject = mongoose.model<ISubject>('Subject', SubjectSchema);

// import mongoose, { Schema, Document } from 'mongoose';

// export interface ISubject extends Document {
//   schoolId: mongoose.Types.ObjectId;
//   branchId: mongoose.Types.ObjectId;
//   classId: mongoose.Types.ObjectId;
//   name: string;
//   code?: string;
//   isDefault: boolean;
//   teacherId?: mongoose.Types.ObjectId;
//   isActive: boolean;
// }

// const SubjectSchema = new Schema<ISubject>(
//   {
//     schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
//     branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
//     classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
//     name: { type: String, required: true, trim: true },
//     code: { type: String, trim: true },
//     isDefault: { type: Boolean, default: false },
//     teacherId: { type: Schema.Types.ObjectId, ref: 'User' },
//     isActive: { type: Boolean, default: true },
//   },
//   { timestamps: true }
// );

// SubjectSchema.index({ schoolId: 1, branchId: 1, classId: 1 });

// export const Subject = mongoose.model<ISubject>('Subject', SubjectSchema);