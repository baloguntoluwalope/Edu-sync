import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendanceEntry {
  attendeeId: mongoose.Types.ObjectId;
  attendeeType: 'student' | 'teacher' | 'staff' | 'admin';
  attendeeName: string;
  admissionOrStaffId?: string;
  classId?: mongoose.Types.ObjectId;
  className?: string;
  status: 'present' | 'absent' | 'late' | 'signed_out';
  method: 'qr' | 'manual' | 'offline_qr' | 'offline_manual';
  signInTime?: Date;
  signOutTime?: Date;
  note?: string;
  markedBy?: mongoose.Types.ObjectId;
  synced?: boolean;
  offlineId?: string;
}

export interface IAttendanceSession extends Document {
  schoolId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  date: string;
  sessionType: string;
  entries: IAttendanceEntry[];
  createdBy?: mongoose.Types.ObjectId;
  isLocked: boolean;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalSignedOut: number;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceEntrySchema = new Schema<IAttendanceEntry>(
  {
    attendeeId: { type: Schema.Types.ObjectId, required: true },
    attendeeType: { type: String, enum: ['student', 'teacher', 'staff', 'admin'], required: true },
    attendeeName: { type: String, required: true },
    admissionOrStaffId: String,
    classId: { type: Schema.Types.ObjectId, ref: 'Class' },
    className: String,
    status: { type: String, enum: ['present', 'absent', 'late', 'signed_out'], required: true },
    method: { type: String, enum: ['qr', 'manual', 'offline_qr', 'offline_manual'], required: true },
    signInTime: Date,
    signOutTime: Date,
    note: String,
    markedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    synced: { type: Boolean, default: true },
    offlineId: { type: String, sparse: true },
  },
  { _id: false }
);

const AttendanceSessionSchema = new Schema<IAttendanceSession>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    date: { type: String, required: true, index: true },
    sessionType: { type: String, default: 'morning' },
    entries: { type: [AttendanceEntrySchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isLocked: { type: Boolean, default: false },
    totalPresent: { type: Number, default: 0 },
    totalAbsent: { type: Number, default: 0 },
    totalLate: { type: Number, default: 0 },
    totalSignedOut: { type: Number, default: 0 },
  },
  { timestamps: true }
);

AttendanceSessionSchema.index({ schoolId: 1, branchId: 1, date: 1, sessionType: 1 }, { unique: true });

export const AttendanceSession = mongoose.model<IAttendanceSession>('AttendanceSession', AttendanceSessionSchema);