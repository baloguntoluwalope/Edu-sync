import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendance extends Document {
  schoolId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  date: string;
  status: 'present' | 'absent' | 'late';
  method: 'qr' | 'manual';
  synced: boolean;
  offlineId?: string;
  note?: string;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    status: { type: String, enum: ['present', 'absent', 'late'], default: 'present' },
    method: { type: String, enum: ['qr', 'manual'], default: 'manual' },
    synced: { type: Boolean, default: true },
    offlineId: { type: String, sparse: true },
    note: String,
  },
  { timestamps: true }
);

AttendanceSchema.index({ schoolId: 1, branchId: 1, classId: 1, date: 1 });
AttendanceSchema.index({ schoolId: 1, studentId: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);