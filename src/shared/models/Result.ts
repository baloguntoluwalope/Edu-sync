import mongoose, { Schema, Document } from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// NIGERIAN WAEC GRADE SYSTEM (matches image exactly)
// ─────────────────────────────────────────────────────────────────────────────
export const getNigerianGrade = (
  score: number
): { grade: string; gradePoint: string; remark: string } => {
  if (score >= 75) return { grade: 'A1', gradePoint: 'A1', remark: 'Excellent' };
  if (score >= 70) return { grade: 'B2', gradePoint: 'B2', remark: 'Very Good' };
  if (score >= 65) return { grade: 'B3', gradePoint: 'B3', remark: 'Good' };
  if (score >= 60) return { grade: 'C4', gradePoint: 'C4', remark: 'Credit' };
  if (score >= 55) return { grade: 'C5', gradePoint: 'C5', remark: 'Credit' };
  if (score >= 50) return { grade: 'C6', gradePoint: 'C6', remark: 'Credit' };
  if (score >= 45) return { grade: 'D7', gradePoint: 'D7', remark: 'Pass' };
  if (score >= 40) return { grade: 'E8', gradePoint: 'E8', remark: 'Pass' };
  return { grade: 'F9', gradePoint: 'P9', remark: 'Fail' };
};

export const getOverallPerformance = (average: number): string => {
  if (average >= 75) return 'Excellent';
  if (average >= 65) return 'Very Good';
  if (average >= 55) return 'Good';
  if (average >= 45) return 'Pass';
  return 'Fail';
};

// ─────────────────────────────────────────────────────────────────────────────
// SUBJECT SCORE
// ─────────────────────────────────────────────────────────────────────────────
export interface ISubjectScore {
  ca1: number;              // Test 1 — max 20
  ca2: number;              // Test 2 — max 20
  exam: number;             // Exam — max 60
  termTotal: number;        // ca1 + ca2 + exam = max 100
  grade: string;            // A1, B2, B3, C4, C5, C6, D7, E8, F9
  gradePoint: string;       // same as grade for Nigerian system
  remark: string;           // Excellent, Very Good, etc.
  subjectPosition?: number; // position in class for this subject
  classAverage?: number;    // average score for this subject in class
  weightedScore?: number;   // cumulative weighted score

  // Cumulative across terms (Nigerian standard)
  firstTermTotal?: number;
  secondTermTotal?: number;
  cumulativeTotal?: number;
  cumulativeAverage?: number;
  cumulativeGrade?: string;
  cumulativeRemark?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// AFFECTIVE DOMAIN (matches image)
// ─────────────────────────────────────────────────────────────────────────────
export interface IAffectiveDomain {
  // Column 1
  punctuality: number;
  mentalAlertness: number;
  behavior: number;
  reliability: number;
  attentiveness: number;
  respect: number;
  neatness: number;
  politeness: number;
  honesty: number;
  relationshipWithStaff: number;
  relationshipWithStudents: number;
  attitudeToSchool: number;
  selfControl: number;

  // Column 2
  spiritOfTeamwork: number;
  initiatives: number;
  organizationalAbility: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PSYCHOMOTOR SKILLS (matches image)
// ─────────────────────────────────────────────────────────────────────────────
export interface IPsychomotor {
  handwriting: number;
  reading: number;
  verbalFluencyDiction: number;
  musicalSkills: number;
  creativeArts: number;
  physicalEducation: number;
  generalReasoning: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULT DOCUMENT
// ─────────────────────────────────────────────────────────────────────────────
export interface IResult extends Document {
  schoolId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  term: 'first' | 'second' | 'third';
  session: string;

  scores: Map<string, ISubjectScore>;

  // Totals
  totalScore: number;
  averageScore: number;
  numberOfSubjects: number;
  overallPerformance: string;

  // Class position info
  positionInClass: number;
  totalStudentsInClass: number;
  highestAverageInClass: number;
  lowestAverageInClass: number;
  classAverageScore: number;

  // Attendance
  daysSchoolOpened: number;
  daysPresent: number;
  daysAbsent: number;

  // Affective & Psychomotor
  affectiveDomain?: IAffectiveDomain;
  psychomotor?: IPsychomotor;

  // Comments
  academicAdviserComment?: string;
  formMasterComment?: string;
  principalComment?: string;

  // Teacher
  classTeacherName?: string;

  // Promotion
  promotionStatus: 'promoted' | 'repeated' | 'pending';
  nextTermBegins?: string;
  termEndDate?: string;

  // School branding
  schoolName?: string;
  branchName?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  schoolLogoUrl?: string;
  principalName?: string;
  principalSignatureUrl?: string;

  // Student info snapshot
  studentName?: string;
  admissionNumber?: string;
  studentAge?: number;
  studentGender?: string;
  studentPassportUrl?: string;
  className?: string;

  // Access control
  isPaid: boolean;
  token?: string;
  tokenGeneratedAt?: Date;
  publishedAt?: Date;
  dateIssued?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────
const SubjectScoreSchema = new Schema<ISubjectScore>(
  {
    ca1: { type: Number, default: 0, min: 0, max: 20 },
    ca2: { type: Number, default: 0, min: 0, max: 20 },
    exam: { type: Number, default: 0, min: 0, max: 60 },
    termTotal: { type: Number, default: 0, min: 0, max: 100 },
    grade: { type: String, default: 'F9' },
    gradePoint: { type: String, default: 'P9' },
    remark: { type: String, default: 'Fail' },
    subjectPosition: Number,
    classAverage: Number,
    weightedScore: Number,
    firstTermTotal: Number,
    secondTermTotal: Number,
    cumulativeTotal: Number,
    cumulativeAverage: Number,
    cumulativeGrade: String,
    cumulativeRemark: String,
  },
  { _id: false }
);

const AffectiveDomainSchema = new Schema<IAffectiveDomain>(
  {
    punctuality: { type: Number, default: 3, min: 1, max: 5 },
    mentalAlertness: { type: Number, default: 3, min: 1, max: 5 },
    behavior: { type: Number, default: 3, min: 1, max: 5 },
    reliability: { type: Number, default: 3, min: 1, max: 5 },
    attentiveness: { type: Number, default: 3, min: 1, max: 5 },
    respect: { type: Number, default: 3, min: 1, max: 5 },
    neatness: { type: Number, default: 3, min: 1, max: 5 },
    politeness: { type: Number, default: 3, min: 1, max: 5 },
    honesty: { type: Number, default: 3, min: 1, max: 5 },
    relationshipWithStaff: { type: Number, default: 3, min: 1, max: 5 },
    relationshipWithStudents: { type: Number, default: 3, min: 1, max: 5 },
    attitudeToSchool: { type: Number, default: 3, min: 1, max: 5 },
    selfControl: { type: Number, default: 3, min: 1, max: 5 },
    spiritOfTeamwork: { type: Number, default: 3, min: 1, max: 5 },
    initiatives: { type: Number, default: 3, min: 1, max: 5 },
    organizationalAbility: { type: Number, default: 3, min: 1, max: 5 },
  },
  { _id: false }
);

const PsychomotorSchema = new Schema<IPsychomotor>(
  {
    handwriting: { type: Number, default: 3, min: 1, max: 5 },
    reading: { type: Number, default: 3, min: 1, max: 5 },
    verbalFluencyDiction: { type: Number, default: 3, min: 1, max: 5 },
    musicalSkills: { type: Number, default: 3, min: 1, max: 5 },
    creativeArts: { type: Number, default: 3, min: 1, max: 5 },
    physicalEducation: { type: Number, default: 3, min: 1, max: 5 },
    generalReasoning: { type: Number, default: 3, min: 1, max: 5 },
  },
  { _id: false }
);

const ResultSchema = new Schema<IResult>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    term: { type: String, enum: ['first', 'second', 'third'], required: true },
    session: { type: String, required: true },

    scores: { type: Map, of: SubjectScoreSchema, default: {} },

    totalScore: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    numberOfSubjects: { type: Number, default: 0 },
    overallPerformance: { type: String, default: 'Fail' },

    positionInClass: { type: Number, default: 0 },
    totalStudentsInClass: { type: Number, default: 0 },
    highestAverageInClass: { type: Number, default: 0 },
    lowestAverageInClass: { type: Number, default: 0 },
    classAverageScore: { type: Number, default: 0 },

    daysSchoolOpened: { type: Number, default: 0 },
    daysPresent: { type: Number, default: 0 },
    daysAbsent: { type: Number, default: 0 },

    affectiveDomain: AffectiveDomainSchema,
    psychomotor: PsychomotorSchema,

    academicAdviserComment: { type: String, maxlength: 300 },
    formMasterComment: { type: String, maxlength: 300 },
    principalComment: { type: String, maxlength: 300 },

    classTeacherName: String,
    promotionStatus: {
      type: String,
      enum: ['promoted', 'repeated', 'pending'],
      default: 'pending',
    },
    nextTermBegins: String,
    termEndDate: String,

    schoolName: String,
    branchName: String,
    schoolAddress: String,
    schoolPhone: String,
    schoolEmail: String,
    schoolLogoUrl: String,
    principalName: String,
    principalSignatureUrl: String,

    studentName: String,
    admissionNumber: String,
    studentAge: Number,
    studentGender: String,
    studentPassportUrl: String,
    className: String,

    isPaid: { type: Boolean, default: false },
    token: { type: String, index: true, sparse: true },
    tokenGeneratedAt: Date,
    publishedAt: Date,
    dateIssued: Date,
  },
  { timestamps: true }
);

ResultSchema.index(
  { schoolId: 1, branchId: 1, studentId: 1, term: 1, session: 1 },
  { unique: true }
);
ResultSchema.index({ schoolId: 1, classId: 1, term: 1, session: 1 });

export const Result = mongoose.model<IResult>('Result', ResultSchema);