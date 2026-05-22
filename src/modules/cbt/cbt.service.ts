import { CBTExam } from '../../shared/models/CBTExam';
import { CBTSubmission } from '../../shared/models/CBTSubmission';
import { User } from '../../shared/models/User';
import { logAudit } from '../../shared/utils/auditLogger';
import { sendNotification } from '../notifications/notification.service';
import { ApiError } from '../../shared/utils/ApiError';
// Import the interface to fix the "File is not a module" and "Implicit any" errors
import { parseQuestionFile, ParsedQuestion } from './cbt.parser';

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD QUESTIONS FROM PDF OR DOCX
// ─────────────────────────────────────────────────────────────────────────────
export const uploadQuestionsFromFile = async (
  schoolId: string,
  branchId: string,
  actorId: string,
  examId: string,
  fileBuffer: Buffer,
  mimetype: string,
  options?: {
    marksPerQuestion?: number;
    appendToExisting?: boolean;
  }
) => {
  const exam = await CBTExam.findOne({ _id: examId, schoolId, branchId });
  if (!exam) throw ApiError.notFound('Exam not found');

  if (exam.isPublished) {
    throw ApiError.badRequest('Cannot modify a published exam. Unpublish it first.');
  }

  // Explicitly type the result from the parser
  const parsed: ParsedQuestion[] = await parseQuestionFile(fileBuffer, mimetype);

  // Fix TS7006: Explicitly type 'q' as ParsedQuestion
  const questions = parsed.map((q: ParsedQuestion) => ({
    text: q.text,
    options: q.options,
    correctIndex: q.correctIndex,
    marks: options?.marksPerQuestion ?? q.marks ?? 1,
  }));

  if (options?.appendToExisting) {
    exam.questions.push(...(questions as any));
  } else {
    exam.questions = questions as any;
  }

  await exam.save();

  await logAudit({
    schoolId, branchId, actorId,
    action: 'CBT_QUESTIONS_UPLOADED_FROM_FILE',
    entity: 'CBTExam',
    entityId: examId,
    metadata: {
      parsedCount: questions.length,
      totalAfter: exam.questions.length,
      mimetype,
      appendMode: options?.appendToExisting || false,
    },
  });

  return {
    examId,
    questionsAdded: questions.length,
    totalQuestions: exam.questions.length,
    // Fix TS7006: Explicitly type 'q' and 'i'
    preview: questions.slice(0, 5).map((q: any, i: number) => ({
      number: i + 1,
      text: q.text.length > 80 ? q.text.slice(0, 80) + '…' : q.text,
      options: q.options.length,
      correctOption: String.fromCharCode(65 + q.correctIndex),
      marks: q.marks,
    })),
    message: `${questions.length} question(s) ${options?.appendToExisting ? 'added to' : 'loaded into'} the exam.`,
  };
};

// ... keep the rest of your functions (createExam, submitExam, etc.) exactly as they are ...


export const createExam = async (
  schoolId: string, branchId: string, actorId: string, data: any
) => {
  const exam = await CBTExam.create({ schoolId, branchId, createdBy: actorId, ...data });
  // Check if exam window is valid
  if (exam.startsAt && new Date() < new Date(exam.startsAt as Date)) {
    throw ApiError.badRequest(
      `This exam has not started yet. It starts at ${new Date(exam.startsAt as Date).toLocaleString()}`
    );
  }
  if (exam.endsAt && new Date() > new Date(exam.endsAt as Date)) {
    throw ApiError.badRequest('This exam has ended and is no longer available.');
  }

  await logAudit({ schoolId, branchId, actorId, action: 'CBT_EXAM_CREATED', entity: 'CBTExam', entityId: (exam._id as any).toString() });
  return exam;
};

export const publishExam = async (schoolId: string, branchId: string, examId: string) => {
  const exam = await CBTExam.findOneAndUpdate(
    { _id: examId, schoolId, branchId },
    { isPublished: true },
    { new: true }
  );
  if (!exam) throw ApiError.notFound('Exam not found');
  return exam;
};

export const getExamForStudent = async (
  schoolId: string, branchId: string, examId: string
) => {
  const exam = await CBTExam.findOne({ _id: examId, schoolId, branchId, isPublished: true }).lean();
  if (!exam) throw ApiError.notFound('Exam not found or not published');

  let questions = [...exam.questions];
  if (exam.shuffleQuestions) questions = questions.sort(() => Math.random() - 0.5);

  return {
    ...exam,
    questions: questions.map(({ correctIndex: _c, ...q }) => q),
  };
};

export const submitExam = async (
  schoolId: string, branchId: string, studentId: string,
  examId: string, answers: Record<string, number>, timeTakenSeconds?: number, offlineId?: string
) => {
  const exists = await CBTSubmission.findOne({ examId, studentId });
  if (exists) throw ApiError.conflict('You have already submitted this exam');

  const exam = await CBTExam.findById(examId);
  if (!exam) throw ApiError.notFound('Exam not found');

  let score = 0, totalMarks = 0;
  for (const q of exam.questions) {
    totalMarks += q.marks;
    const qid = (q._id as any).toString();
    if (answers[qid] === q.correctIndex) score += q.marks;
  }
  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

  const submission = await CBTSubmission.create({
    schoolId, branchId, examId, studentId, answers,
    score, totalMarks, percentage, synced: true, offlineId,
    timeTakenSeconds, submittedAt: new Date(),
  });

  await logAudit({
    schoolId, branchId, actorId: studentId,
    action: 'CBT_SUBMITTED', entity: 'CBTSubmission',
    entityId: (submission._id as any).toString(),
    metadata: { examId, score, percentage },
  });

  // Notify admins and teachers
  const student = await User.findById(studentId).select('firstName lastName');
  const recipients = await User.find({ schoolId, branchId, role: { $in: ['schooladmin', 'teacher'] } }).select('_id');

  for (const r of recipients) {
    await sendNotification({
      schoolId, branchId,
      recipientId: (r._id as any).toString(),
      type: 'cbt',
      title: 'CBT Submission',
      body: `${student?.firstName} ${student?.lastName} submitted "${exam.title}" — ${score}/${totalMarks} (${percentage}%)`,
      metadata: { examId, studentId, score, percentage },
    });
  }

  return { score, totalMarks, percentage };
};

export const syncOfflineCBT = async (schoolId: string, branchId: string, submissions: any[]) => {
  const results = [];
  for (const sub of submissions) {
    const exists = await CBTSubmission.findOne({
      $or: [{ offlineId: sub.offlineId }, { examId: sub.examId, studentId: sub.studentId }],
    });
    if (exists) continue;
    const r = await submitExam(schoolId, branchId, sub.studentId, sub.examId, sub.answers, sub.timeTakenSeconds, sub.offlineId);
    results.push(r);
  }
  return { synced: results.length };
};

export const getExamResults = async (
  schoolId: string, branchId: string, examId: string
) => {
  return CBTSubmission.find({ schoolId, branchId, examId })
    .populate('studentId', 'firstName lastName admissionNumber')
    .lean();
};

export const getActiveExamsForStudent = async (
  schoolId: string,
  branchId: string,
  classId: string
) => {
  const now = new Date();
  return CBTExam.find({
    schoolId, branchId, classId,
    isPublished: true,
    $or: [
      { startsAt: { $exists: false } },
      { startsAt: { $lte: now } },
    ],
    $and: [
      {
        $or: [
          { endsAt: { $exists: false } },
          { endsAt: { $gte: now } },
        ],
      },
    ],
  })
    .select('title subjectId durationMinutes instructions startsAt endsAt offlineAvailable')
    .lean();
};