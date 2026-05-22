import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { Result, getNigerianGrade, getOverallPerformance, ISubjectScore } from '../../shared/models/Result';
import { Branch } from '../../shared/models/Branch';
import { School } from '../../shared/models/School';
import { User } from '../../shared/models/User';
import { Class } from '../../shared/models/Class';
import { Subject } from '../../shared/models/Subject';
import { ApiError } from '../../shared/utils/ApiError';
import { logAudit } from '../../shared/utils/auditLogger';
import { sendEmail, resultTokenTemplate } from '../../shared/utils/emailTemplates';
import { getPagination, paginatedResponse } from '../../shared/utils/pagination';
import { env } from '../../config/env';
import { buildResultCardHTML } from './resultCard.template';
import { generatePDF } from './pdf.service';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Calculate Nigerian cumulative scores across terms
const calcCumulative = async (
  schoolId: string,
  branchId: string,
  studentId: string,
  session: string,
  term: 'first' | 'second' | 'third',
  subjectId: string,
  thisTermTotal: number
) => {
  if (term === 'first') {
    return {
      cumulativeTotal: thisTermTotal,
      cumulativeAverage: thisTermTotal,
    };
  }

  if (term === 'second') {
    const firstResult = await Result.findOne({
      schoolId, branchId, studentId, session, term: 'first',
    }).lean();

    const firstTotal = (firstResult?.scores as any)?.get?.(subjectId)?.termTotal ?? 0;
    const cumTotal = firstTotal + thisTermTotal;

    return {
      firstTermTotal: firstTotal,
      cumulativeTotal: cumTotal,
      cumulativeAverage: Math.round(cumTotal / 2),
    };
  }

  // third term
  const [firstResult, secondResult] = await Promise.all([
    Result.findOne({ schoolId, branchId, studentId, session, term: 'first' }).lean(),
    Result.findOne({ schoolId, branchId, studentId, session, term: 'second' }).lean(),
  ]);

  const getScore = (r: any, sid: string): number => {
    if (!r?.scores) return 0;
    const m = r.scores instanceof Map ? r.scores : new Map(Object.entries(r.scores));
    return (m.get(sid) as ISubjectScore)?.termTotal ?? 0;
  };

  const firstTotal = getScore(firstResult, subjectId);
  const secondTotal = getScore(secondResult, subjectId);
  const cumTotal = firstTotal + secondTotal + thisTermTotal;

  return {
    firstTermTotal: firstTotal,
    secondTermTotal: secondTotal,
    cumulativeTotal: cumTotal,
    cumulativeAverage: Math.round(cumTotal / 3),
  };
};

// Recalculate result totals after scores update
const recalcTotals = async (resultId: string) => {
  const result = await Result.findById(resultId);
  if (!result) return;

  const scoresMap = result.scores instanceof Map
    ? result.scores
    : new Map(Object.entries(result.scores as any));

  const allScores = Array.from(scoresMap.values()) as ISubjectScore[];
  if (!allScores.length) return;

  const totalScore = allScores.reduce((s, sc) => s + (sc.termTotal || 0), 0);
  const averageScore = parseFloat((totalScore / allScores.length).toFixed(2));
  const numberOfSubjects = allScores.length;
  const overallPerformance = getOverallPerformance(averageScore);

  await Result.findByIdAndUpdate(resultId, {
    totalScore,
    averageScore,
    numberOfSubjects,
    overallPerformance,
  });
};

// Build school branding snapshot from DB
const getBranding = async (schoolId: string, branchId: string, classId: string) => {
  const [school, branch, cls] = await Promise.all([
    School.findById(schoolId).select('name email phone address').lean(),
    Branch.findById(branchId)
      .select('name principalName principalSignatureUrl logoUrl address phone email')
      .lean(),
    Class.findById(classId).select('name').lean(),
  ]);

  return { school, branch, cls };
};

// ─────────────────────────────────────────────────────────────────────────────
// UPSERT SINGLE SUBJECT SCORE
// ─────────────────────────────────────────────────────────────────────────────
export const upsertResult = async (
  schoolId: string,
  branchId: string,
  actorId: string,
  data: {
    studentId: string;
    classId: string;
    term: 'first' | 'second' | 'third';
    session: string;
    subjectId: string;
    ca1: number;
    ca2: number;
    exam: number;
  }
) => {
  const termTotal = data.ca1 + data.ca2 + data.exam;
  const { grade, gradePoint, remark } = getNigerianGrade(termTotal);
  const cumulative = await calcCumulative(
    schoolId, branchId, data.studentId, data.session, data.term, data.subjectId, termTotal
  );

  const cumGrade = cumulative.cumulativeAverage !== undefined
    ? getNigerianGrade(cumulative.cumulativeAverage)
    : null;

  const { school, branch, cls } = await getBranding(schoolId, branchId, data.classId);
  const student = await User.findById(data.studentId)
    .select('firstName lastName admissionNumber dateOfBirth gender passportUrl')
    .lean();

  const age = student?.dateOfBirth
    ? dayjs().diff(dayjs(student.dateOfBirth), 'year')
    : undefined;

  const scoreEntry: ISubjectScore = {
    ca1: data.ca1,
    ca2: data.ca2,
    exam: data.exam,
    termTotal,
    grade,
    gradePoint,
    remark,
    firstTermTotal: cumulative.firstTermTotal,
    secondTermTotal: cumulative.secondTermTotal,
    cumulativeTotal: cumulative.cumulativeTotal,
    cumulativeAverage: cumulative.cumulativeAverage,
    cumulativeGrade: cumGrade?.grade,
    cumulativeRemark: cumGrade?.remark,
  };

  const result = await Result.findOneAndUpdate(
    { schoolId, branchId, studentId: data.studentId, term: data.term, session: data.session },
    {
      $set: {
        classId: data.classId,
        [`scores.${data.subjectId}`]: scoreEntry,
        // Branding snapshot
        schoolName: school?.name,
        branchName: branch?.name,
        schoolAddress: branch?.address || school?.address,
        schoolPhone: branch?.phone || school?.phone,
        schoolEmail: branch?.email || school?.email,
        schoolLogoUrl: branch?.logoUrl,
        principalName: branch?.principalName,
        principalSignatureUrl: branch?.principalSignatureUrl,
        className: cls?.name,
        // Student snapshot
        studentName: `${student?.firstName} ${student?.lastName}`,
        admissionNumber: student?.admissionNumber,
        studentAge: age,
        studentGender: student?.gender,
        studentPassportUrl: student?.passportUrl,
      },
    },
    { upsert: true, new: true }
  );

  await recalcTotals((result._id as any).toString());

  return result;
};


// ─────────────────────────────────────────────────────────────────────────────
// BULK SUBJECTS INPUT PER STUDENT
// Enter all subjects for one student at once in a single request
// ─────────────────────────────────────────────────────────────────────────────
export const bulkSubjectsForStudent = async (
  schoolId: string,
  branchId: string,
  actorId: string,
  data: {
    studentId: string;
    classId: string;
    term: 'first' | 'second' | 'third';
    session: string;
    subjects: {
      subjectId: string;
      ca1: number;
      ca2: number;
      exam: number;
    }[];
  }
) => {
  // Validate student belongs to this school and branch
  const student = await User.findOne({
    _id: data.studentId,
    schoolId,
    branchId,
    role: 'student',
    isActive: true,
  }).select('firstName lastName admissionNumber').lean();

  if (!student) throw ApiError.notFound('Student not found in this branch');

  // Validate class belongs to this branch
  const cls = await Class.findOne({
    _id: data.classId, schoolId, branchId,
  }).select('name studentIds').lean();

  if (!cls) throw ApiError.notFound('Class not found in this branch');

  // Confirm student is in this class
  const inClass = cls.studentIds
    .map((id: any) => id.toString())
    .includes(data.studentId.toString());

  if (!inClass) {
    throw ApiError.badRequest(
      `${student.firstName} ${student.lastName} is not enrolled in this class`
    );
  }

  // Validate all subjectIds belong to this branch
  const subjectIds = data.subjects.map((s) => s.subjectId);
  const validSubjects = await Subject.find({
    _id: { $in: subjectIds }, schoolId, branchId,
  }).select('name').lean();

  if (validSubjects.length !== subjectIds.length) {
    throw ApiError.badRequest('One or more subject IDs are invalid for this branch');
  }

  const subjectNameMap: Record<string, string> = {};
  validSubjects.forEach((s) => {
    subjectNameMap[(s._id as any).toString()] = s.name;
  });

  // Validate score ranges
  for (const entry of data.subjects) {
    if (entry.ca1 < 0 || entry.ca1 > 20) {
      throw ApiError.badRequest(
        `CA1 for subject ${subjectNameMap[entry.subjectId] || entry.subjectId} must be between 0 and 20`
      );
    }
    if (entry.ca2 < 0 || entry.ca2 > 20) {
      throw ApiError.badRequest(
        `CA2 for subject ${subjectNameMap[entry.subjectId] || entry.subjectId} must be between 0 and 20`
      );
    }
    if (entry.exam < 0 || entry.exam > 60) {
      throw ApiError.badRequest(
        `Exam score for subject ${subjectNameMap[entry.subjectId] || entry.subjectId} must be between 0 and 60`
      );
    }
  }

  const results: any[] = [];
  const errors: { subjectId: string; subjectName: string; error: string }[] = [];

  for (const entry of data.subjects) {
    try {
      const result = await upsertResult(schoolId, branchId, actorId, {
        studentId: data.studentId,
        classId: data.classId,
        term: data.term,
        session: data.session,
        subjectId: entry.subjectId,
        ca1: entry.ca1,
        ca2: entry.ca2,
        exam: entry.exam,
      });
      results.push({
        subjectId: entry.subjectId,
        subjectName: subjectNameMap[entry.subjectId],
        termTotal: entry.ca1 + entry.ca2 + entry.exam,
      });
    } catch (err: any) {
      errors.push({
        subjectId: entry.subjectId,
        subjectName: subjectNameMap[entry.subjectId] || entry.subjectId,
        error: err.message,
      });
    }
  }

  await logAudit({
    schoolId,
    branchId,
    actorId,
    action: 'RESULTS_BULK_SUBJECTS_FOR_STUDENT',
    entity: 'Result',
    metadata: {
      studentId: data.studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      term: data.term,
      session: data.session,
      subjectsProcessed: results.length,
      errors: errors.length,
    },
  });

  return {
    studentId: data.studentId,
    studentName: `${student.firstName} ${student.lastName}`,
    admissionNumber: student.admissionNumber,
    term: data.term,
    session: data.session,
    processed: results.length,
    errors,
    subjects: results,
    message: `${results.length} subject(s) saved for ${student.firstName} ${student.lastName}. ${errors.length} failed.`,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// PARENT GENERATES TOKEN
// Parent must provide their child's admission number and last name
// The parent must be linked to the student and result must be paid
// ─────────────────────────────────────────────────────────────────────────────
export const parentGenerateToken = async (
  schoolId: string,
  branchId: string,
  parentId: string,
  data: {
    admissionNumber: string;
    studentLastName: string;
    term: string;
    session: string;
  }
) => {
  // Verify parent account
  const parent = await User.findOne({
    _id: parentId,
    schoolId,
    branchId,
    role: 'parent',
    isActive: true,
  }).select('firstName lastName linkedStudents').lean();

  if (!parent) throw ApiError.notFound('Parent account not found');

  // Find student by admission number and last name
  const student = await User.findOne({
    schoolId,
    branchId,
    admissionNumber: data.admissionNumber.trim().toUpperCase(),
    lastName: { $regex: `^${data.studentLastName.trim()}$`, $options: 'i' },
    role: 'student',
    isActive: true,
  }).select('_id firstName lastName admissionNumber').lean();

  if (!student) {
    throw ApiError.notFound(
      'Student not found. Check the admission number and last name carefully.'
    );
  }

  // Confirm this parent is linked to this student
  const isLinked = (parent.linkedStudents || [])
    .map((id: any) => id.toString())
    .includes((student._id as any).toString());

  if (!isLinked) {
    throw ApiError.forbidden(
      'You are not linked to this student. Please contact the school to link your account.'
    );
  }

  // Find result
  const result = await Result.findOne({
    schoolId,
    branchId,
    studentId: student._id,
    term: data.term,
    session: data.session,
  });

  if (!result) {
    throw ApiError.notFound('Result not found for this student and term.');
  }

  if (!result.publishedAt) {
    throw ApiError.badRequest('Results have not been published yet. Please check back later.');
  }

  if (!result.isPaid) {
    throw new ApiError(
      402,
      'Result access requires payment. Please contact the school to complete payment.'
    );
  }

  // If token already exists return it (do not regenerate)
  if (result.token) {
    return {
      token: result.token,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      term: data.term,
      session: data.session,
      tokenGeneratedAt: result.tokenGeneratedAt,
      viewUrl: `${env.FRONTEND_URL}/results/view?token=${result.token}`,
      message: 'Your existing token has been retrieved.',
    };
  }

  // Generate new token
  const token = uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase();
  result.token = token;
  result.tokenGeneratedAt = new Date();
  await result.save();

  await logAudit({
    schoolId,
    branchId,
    actorId: parentId,
    action: 'PARENT_GENERATED_TOKEN',
    entity: 'Result',
    entityId: (result._id as any).toString(),
    metadata: {
      parentId,
      studentId: (student._id as any).toString(),
      admissionNumber: student.admissionNumber,
      term: data.term,
      session: data.session,
    },
  });

  return {
    token,
    studentName: `${student.firstName} ${student.lastName}`,
    admissionNumber: student.admissionNumber,
    term: data.term,
    session: data.session,
    tokenGeneratedAt: result.tokenGeneratedAt,
    viewUrl: `${env.FRONTEND_URL}/results/view?token=${token}`,
    message: 'Token generated successfully. Use it to view and download the result.',
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// PARENT VIEWS RESULT WITH TOKEN
// Validates the token belongs to one of the parent's linked students
// ─────────────────────────────────────────────────────────────────────────────
export const parentViewResultByToken = async (
  parentId: string,
  token: string
) => {
  // Find the result with this token
  const result = await Result.findOne({ token }).lean();
  if (!result) throw ApiError.notFound('Invalid token. Please check and try again.');

  if (!result.publishedAt) {
    throw ApiError.badRequest('This result has not been published yet.');
  }

  if (!result.isPaid) {
    throw new ApiError(402, 'This result requires payment.');
  }

  // Verify parent is linked to this student
  const parent = await User.findById(parentId)
    .select('linkedStudents firstName')
    .lean();

  if (!parent) throw ApiError.notFound('Parent account not found');

  const isLinked = (parent.linkedStudents || [])
    .map((id: any) => id.toString())
    .includes((result.studentId as any).toString());

  if (!isLinked) {
    throw ApiError.forbidden('This result does not belong to any of your linked children.');
  }

  // Get subject names
  const subjectIds = Array.from(
    (result.scores instanceof Map
      ? result.scores
      : new Map(Object.entries(result.scores as any))
    ).keys()
  );

  const subjects = await Subject.find({ _id: { $in: subjectIds } })
    .select('name')
    .lean();

  const subjectNames: Record<string, string> = {};
  subjects.forEach((s) => {
    subjectNames[(s._id as any).toString()] = s.name;
  });

  return { result, subjectNames };
};

// ─────────────────────────────────────────────────────────────────────────────
// BULK INPUT PER SUBJECT FOR AN ENTIRE CLASS
// Teacher enters scores for all students in a class for one subject at once
// ─────────────────────────────────────────────────────────────────────────────
export const bulkInputForClass = async (
  schoolId: string,
  branchId: string,
  actorId: string,
  data: {
    classId: string;
    subjectId: string;
    term: 'first' | 'second' | 'third';
    session: string;
    entries: {
      studentId: string;
      ca1: number;
      ca2: number;
      exam: number;
    }[];
  }
) => {
  // Validate class and subject belong to this branch
  const [cls, subject] = await Promise.all([
    Class.findOne({ _id: data.classId, schoolId, branchId }).lean(),
    Subject.findOne({ _id: data.subjectId, schoolId, branchId }).lean(),
  ]);

  if (!cls) throw ApiError.notFound('Class not found in this branch');
  if (!subject) throw ApiError.notFound('Subject not found in this branch');

  // Validate all studentIds belong to this class
  const classStudentIds = cls.studentIds.map((id: any) => id.toString());
  const invalidStudents = data.entries.filter(
    (e) => !classStudentIds.includes(e.studentId.toString())
  );

  if (invalidStudents.length) {
    throw ApiError.badRequest(
      `${invalidStudents.length} student(s) do not belong to this class`
    );
  }

  const results = [];
  const errors: { studentId: string; error: string }[] = [];

  for (const entry of data.entries) {
    try {
      const result = await upsertResult(schoolId, branchId, actorId, {
        studentId: entry.studentId,
        classId: data.classId,
        term: data.term,
        session: data.session,
        subjectId: data.subjectId,
        ca1: entry.ca1,
        ca2: entry.ca2,
        exam: entry.exam,
      });
      results.push(result);
    } catch (err: any) {
      errors.push({ studentId: entry.studentId, error: err.message });
    }
  }

  await logAudit({
    schoolId,
    branchId,
    actorId,
    action: 'RESULTS_BULK_CLASS_INPUT',
    entity: 'Result',
    metadata: {
      classId: data.classId,
      className: cls.name,
      subjectId: data.subjectId,
      subjectName: subject.name,
      term: data.term,
      session: data.session,
      processed: results.length,
      errors: errors.length,
    },
  });

  return {
    processed: results.length,
    errors,
    message: `${results.length} results saved. ${errors.length} failed.`,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPUTE CLASS POSITIONS + SUBJECT POSITIONS + CLASS AVERAGES
// Run after all scores for a class/term/session are entered
// ─────────────────────────────────────────────────────────────────────────────
export const computeClassPositions = async (
  schoolId: string,
  branchId: string,
  classId: string,
  term: string,
  session: string,
  actorId: string
) => {
  const results = await Result.find({ schoolId, branchId, classId, term, session });
  if (!results.length) throw ApiError.notFound('No results found for this class and term');

  const totalStudents = results.length;

  // Sort by average descending for overall positions
  const sorted = [...results].sort((a, b) => b.averageScore - a.averageScore);
  const averages = sorted.map((r) => r.averageScore);
  const highestAverageInClass = averages[0] || 0;
  const lowestAverageInClass = averages[averages.length - 1] || 0;
  const classAverageScore = parseFloat(
    (averages.reduce((s, a) => s + a, 0) / averages.length).toFixed(2)
  );

  // Build subject → all scores map for subject positions and class averages
  const subjectScoresMap: Record<string, { studentId: string; total: number }[]> = {};

  for (const result of results) {
    const scoresMap = result.scores instanceof Map
      ? result.scores
      : new Map(Object.entries(result.scores as any));

    for (const [subjectId, score] of Array.from(scoresMap.entries())) {
      const s = score as ISubjectScore;
      if (!subjectScoresMap[subjectId]) subjectScoresMap[subjectId] = [];
      subjectScoresMap[subjectId].push({
        studentId: (result.studentId as any).toString(),
        total: s.termTotal || 0,
      });
    }
  }

  // Calculate subject positions and class averages per subject
  const subjectPositions: Record<string, Record<string, number>> = {};
  const subjectClassAverages: Record<string, number> = {};

  for (const [subjectId, scores] of Object.entries(subjectScoresMap)) {
    const sorted = [...scores].sort((a, b) => b.total - a.total);
    const avg = parseFloat(
      (scores.reduce((s, sc) => s + sc.total, 0) / scores.length).toFixed(2)
    );
    subjectClassAverages[subjectId] = avg;

    sorted.forEach((entry, idx) => {
      if (!subjectPositions[subjectId]) subjectPositions[subjectId] = {};
      const pos = idx === 0
        ? 1
        : entry.total === sorted[idx - 1].total
          ? subjectPositions[subjectId][sorted[idx - 1].studentId]
          : idx + 1;
      subjectPositions[subjectId][entry.studentId] = pos;
    });
  }

  // Update all results
  const updates = sorted.map((result, idx) => {
    const studentId = (result.studentId as any).toString();

    // Overall position (handle ties)
    const position = idx === 0
      ? 1
      : result.averageScore === sorted[idx - 1].averageScore
        ? (sorted[idx - 1] as any).__position || idx + 1
        : idx + 1;

    (sorted[idx] as any).__position = position;

    // Update subject scores with positions and class averages
    const scoresMap = result.scores instanceof Map
      ? result.scores
      : new Map(Object.entries(result.scores as any));

    const updatedScores: Record<string, unknown> = {};

    for (const [subjectId, score] of Array.from(scoresMap.entries())) {
      const s = score as ISubjectScore;
      updatedScores[`scores.${subjectId}`] = {
        ...s,
        subjectPosition: subjectPositions[subjectId]?.[studentId] || 0,
        classAverage: subjectClassAverages[subjectId] || 0,
        weightedScore: s.cumulativeAverage ?? s.termTotal,
      };
    }

    return Result.findByIdAndUpdate(result._id, {
      $set: {
        positionInClass: position,
        totalStudentsInClass: totalStudents,
        highestAverageInClass,
        lowestAverageInClass,
        classAverageScore,
        ...updatedScores,
      },
    });
  });

  await Promise.all(updates);

  await logAudit({
    schoolId,
    branchId,
    actorId,
    action: 'CLASS_POSITIONS_COMPUTED',
    entity: 'Result',
    metadata: { classId, term, session, totalStudents },
  });

  return { computed: totalStudents, highestAverageInClass, lowestAverageInClass, classAverageScore };
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLISH RESULTS PER CLASS
// ─────────────────────────────────────────────────────────────────────────────
export const publishResultsForClass = async (
  schoolId: string,
  branchId: string,
  classId: string,
  term: string,
  session: string,
  actorId: string
) => {
  const updated = await Result.updateMany(
    { schoolId, branchId, classId, term, session, publishedAt: { $exists: false } },
    { $set: { publishedAt: new Date(), dateIssued: new Date() } }
  );

  await logAudit({
    schoolId, branchId, actorId,
    action: 'RESULTS_PUBLISHED_FOR_CLASS',
    entity: 'Result',
    metadata: { classId, term, session, count: updated.modifiedCount },
  });

  return { published: updated.modifiedCount };
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLISH ALL RESULTS FOR ENTIRE SCHOOL
// ─────────────────────────────────────────────────────────────────────────────
export const publishResultsForSchool = async (
  schoolId: string,
  branchId: string,
  term: string,
  session: string,
  actorId: string
) => {
  const updated = await Result.updateMany(
    { schoolId, branchId, term, session, publishedAt: { $exists: false } },
    { $set: { publishedAt: new Date(), dateIssued: new Date() } }
  );

  await logAudit({
    schoolId, branchId, actorId,
    action: 'RESULTS_PUBLISHED_FOR_SCHOOL',
    entity: 'Result',
    metadata: { term, session, count: updated.modifiedCount },
  });

  return { published: updated.modifiedCount };
};

// ─────────────────────────────────────────────────────────────────────────────
// BULK GENERATE TOKENS — For all published paid results in a class or school
// ─────────────────────────────────────────────────────────────────────────────
export const bulkGenerateTokens = async (
  schoolId: string,
  branchId: string,
  term: string,
  session: string,
  actorId: string,
  classId?: string
) => {
  const query: Record<string, unknown> = {
    schoolId, branchId, term, session,
    isPaid: true,
    publishedAt: { $exists: true },
    token: { $exists: false },
  };
  if (classId) query.classId = classId;

  const results = await Result.find(query);
  if (!results.length) {
    throw ApiError.badRequest(
      'No eligible results found. Results must be published and marked as paid.'
    );
  }

  const generated: { studentId: string; studentName: string; token: string }[] = [];

  for (const result of results) {
    const token = uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase();
    result.token = token;
    result.tokenGeneratedAt = new Date();
    await result.save();
    generated.push({
      studentId: (result.studentId as any).toString(),
      studentName: result.studentName || '',
      token,
    });

    // Email token to linked parents
    const parents = await User.find({
      linkedStudents: result.studentId,
      role: 'parent',
      isActive: true,
      email: { $exists: true, $ne: '' },
    }).select('email firstName').lean();

    for (const parent of parents) {
      try {
        const branch = await Branch.findById(branchId).select('name logoUrl').lean();
        const { subject, html } = resultTokenTemplate({
          recipientName: parent.firstName,
          studentName: result.studentName || '',
          term: term.charAt(0).toUpperCase() + term.slice(1),
          session,
          token,
          schoolName: result.schoolName || '',
          branchName: branch?.name || '',
          checkResultUrl: `${env.FRONTEND_URL}/results/view?token=${token}`,
          logoUrl: branch?.logoUrl,
        });
        await sendEmail(parent.email!, subject, html);
      } catch {
        // Non-blocking
      }
    }
  }

  await logAudit({
    schoolId, branchId, actorId,
    action: 'TOKENS_BULK_GENERATED',
    entity: 'Result',
    metadata: { term, session, classId, count: generated.length },
  });

  return { generated: generated.length, tokens: generated };
};

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE TOKEN — Single student
// ─────────────────────────────────────────────────────────────────────────────
export const generateToken = async (
  schoolId: string,
  branchId: string,
  studentId: string,
  term: string,
  session: string
) => {
  const result = await Result.findOne({ schoolId, branchId, studentId, term, session });
  if (!result) throw ApiError.notFound('Result not found');
  if (!result.isPaid) {
    throw new ApiError(402, 'Result is not paid. Please complete payment before generating token.');
  }
  if (!result.publishedAt) {
    throw ApiError.badRequest('Result has not been published yet.');
  }

  const token = uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase();
  result.token = token;
  result.tokenGeneratedAt = new Date();
  await result.save();

  // Email to parents
  const [parents, branch] = await Promise.all([
    User.find({
      linkedStudents: studentId, role: 'parent', isActive: true,
      email: { $exists: true, $ne: '' },
    }).select('email firstName').lean(),
    Branch.findById(branchId).select('name logoUrl').lean(),
  ]);

  for (const parent of parents) {
    try {
      const { subject, html } = resultTokenTemplate({
        recipientName: parent.firstName,
        studentName: result.studentName || '',
        term: term.charAt(0).toUpperCase() + term.slice(1),
        session,
        token,
        schoolName: result.schoolName || '',
        branchName: branch?.name || '',
        checkResultUrl: `${env.FRONTEND_URL}/results/view?token=${token}`,
        logoUrl: branch?.logoUrl,
      });
      await sendEmail(parent.email!, subject, html);
    } catch {
      // Non-blocking
    }
  }

  return { token, sentToParents: parents.length };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL TOKENS — Admin views all tokens for a term/session
// ─────────────────────────────────────────────────────────────────────────────
export const getAllTokens = async (
  schoolId: string,
  branchId: string,
  term: string,
  session: string,
  classId?: string,
  page = 1,
  limit = 30
) => {
  const { skip } = getPagination(page, limit);
  const query: Record<string, unknown> = {
    schoolId, branchId, term, session,
    token: { $exists: true, $ne: null },
  };
  if (classId) query.classId = classId;

  const [data, total] = await Promise.all([
    Result.find(query)
      .select('studentName admissionNumber className token tokenGeneratedAt isPaid publishedAt')
      .sort({ tokenGeneratedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Result.countDocuments(query),
  ]);

  return paginatedResponse(data, total, page, limit);
};

// ─────────────────────────────────────────────────────────────────────────────
// MARK PAID — Single student
// ─────────────────────────────────────────────────────────────────────────────
export const markPaid = async (
  schoolId: string,
  branchId: string,
  actorId: string,
  studentId: string,
  term: string,
  session: string
) => {
  const result = await Result.findOneAndUpdate(
    { schoolId, branchId, studentId, term, session },
    { isPaid: true },
    { new: true }
  );
  if (!result) throw ApiError.notFound('Result not found');

  await logAudit({
    schoolId, branchId, actorId,
    action: 'RESULT_MARKED_PAID', entity: 'Result',
    entityId: (result._id as any).toString(),
  });

  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// BULK MARK PAID — All students in a class
// ─────────────────────────────────────────────────────────────────────────────
export const bulkMarkPaid = async (
  schoolId: string,
  branchId: string,
  actorId: string,
  term: string,
  session: string,
  classId?: string
) => {
  const query: Record<string, unknown> = { schoolId, branchId, term, session };
  if (classId) query.classId = classId;

  const updated = await Result.updateMany(query, { $set: { isPaid: true } });

  await logAudit({
    schoolId, branchId, actorId,
    action: 'RESULTS_BULK_MARKED_PAID',
    entity: 'Result',
    metadata: { term, session, classId, count: updated.modifiedCount },
  });

  return { paid: updated.modifiedCount };
};

// ─────────────────────────────────────────────────────────────────────────────
// VIEW RESULT — Public via token (outsiders and parents)
// ─────────────────────────────────────────────────────────────────────────────
export const viewResultByToken = async (token: string) => {
  const result = await Result.findOne({ token }).lean();

  if (!result) throw ApiError.notFound('Invalid or expired token.');
  if (!result.publishedAt) throw ApiError.badRequest('Result has not been published yet.');

  // Get subject names
  const subjectIds = Array.from(
    (result.scores instanceof Map ? result.scores : new Map(Object.entries(result.scores as any))).keys()
  );

  const subjects = await Subject.find({ _id: { $in: subjectIds } }).select('name').lean();
  const subjectNames: Record<string, string> = {};
  subjects.forEach((s) => {
    subjectNames[(s._id as any).toString()] = s.name;
  });

  return { result, subjectNames };
};

// ─────────────────────────────────────────────────────────────────────────────
// VIEW RESULT BY ADMISSION NUMBER — Parent checks if they are paid
// ─────────────────────────────────────────────────────────────────────────────
export const viewResultByAdmission = async (
  schoolId: string,
  branchId: string,
  admissionNumber: string,
  term: string,
  session: string
) => {
  const student = await User.findOne({
    schoolId, branchId, admissionNumber: admissionNumber.trim().toUpperCase(), role: 'student',
  }).lean();
  if (!student) throw ApiError.notFound('Student not found');

  const result = await Result.findOne({
    schoolId, branchId,
    studentId: student._id,
    term, session,
  }).lean();

  if (!result) throw ApiError.notFound('Result not found for this student');
  if (!result.publishedAt) throw ApiError.badRequest('Results have not been published yet');

  if (!result.isPaid) {
    // Return limited info — just let them know they need to pay
    return {
      isPaid: false,
      studentName: result.studentName,
      admissionNumber: result.admissionNumber,
      term,
      session,
      className: result.className,
      message: 'Result access requires payment. Please contact the school to complete payment.',
    };
  }

  // Paid — return full result + token
  const subjectIds = Array.from(
    (result.scores instanceof Map ? result.scores : new Map(Object.entries(result.scores as any))).keys()
  );
  const subjects = await Subject.find({ _id: { $in: subjectIds } }).select('name').lean();
  const subjectNames: Record<string, string> = {};
  subjects.forEach((s) => { subjectNames[(s._id as any).toString()] = s.name; });

  return {
    isPaid: true,
    result,
    subjectNames,
    token: result.token,
    message: result.token
      ? 'Access granted. Use your token to download the PDF.'
      : 'Payment confirmed. Token not yet generated. Please contact the school.',
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// VIEW RESULT — Admin view (no token required)
// ─────────────────────────────────────────────────────────────────────────────
export const adminViewResult = async (
  schoolId: string,
  branchId: string,
  studentId: string,
  term: string,
  session: string
) => {
  const result = await Result.findOne({ schoolId, branchId, studentId, term, session }).lean();
  if (!result) throw ApiError.notFound('Result not found');

  const subjectIds = Array.from(
    (result.scores instanceof Map ? result.scores : new Map(Object.entries(result.scores as any))).keys()
  );
  const subjects = await Subject.find({ _id: { $in: subjectIds } }).select('name').lean();
  const subjectNames: Record<string, string> = {};
  subjects.forEach((s) => { subjectNames[(s._id as any).toString()] = s.name; });

  return { result, subjectNames };
};

// ─────────────────────────────────────────────────────────────────────────────
// LIST RESULTS FOR A CLASS — Admin
// ─────────────────────────────────────────────────────────────────────────────
export const listClassResults = async (
  schoolId: string,
  branchId: string,
  classId: string,
  term: string,
  session: string,
  page = 1,
  limit = 30
) => {
  const { skip } = getPagination(page, limit);
  const query = { schoolId, branchId, classId, term, session };

  const [data, total] = await Promise.all([
    Result.find(query)
      .select('studentName admissionNumber averageScore positionInClass isPaid publishedAt token totalScore numberOfSubjects overallPerformance promotionStatus')
      .sort({ positionInClass: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Result.countDocuments(query),
  ]);

  return paginatedResponse(data, total, page, limit);
};

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE PDF — Admin (no token needed)
// ─────────────────────────────────────────────────────────────────────────────
export const generateResultPDF = async (
  schoolId: string,
  branchId: string,
  studentId: string,
  term: string,
  session: string
): Promise<Buffer> => {
  const { result, subjectNames } = await adminViewResult(schoolId, branchId, studentId, term, session);
  const html = buildResultCardHTML(result as any, subjectNames);
  return generatePDF(html);
};

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE PDF — Public via token
// ─────────────────────────────────────────────────────────────────────────────
export const generateResultPDFByToken = async (token: string): Promise<Buffer> => {
  const { result, subjectNames } = await viewResultByToken(token);
  if (!result.isPaid) {
    throw new ApiError(402, 'Result access requires payment.');
  }
  const html = buildResultCardHTML(result as any, subjectNames);
  return generatePDF(html);
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE EXTRAS — Comments, affective, psychomotor, attendance
// ─────────────────────────────────────────────────────────────────────────────
export const updateResultExtras = async (
  schoolId: string,
  branchId: string,
  actorId: string,
  studentId: string,
  term: string,
  session: string,
  data: {
    academicAdviserComment?: string;
    formMasterComment?: string;
    principalComment?: string;
    classTeacherName?: string;
    promotionStatus?: 'promoted' | 'repeated' | 'pending';
    nextTermBegins?: string;
    termEndDate?: string;
    daysSchoolOpened?: number;
    daysPresent?: number;
    daysAbsent?: number;
    affectiveDomain?: Record<string, number>;
    psychomotor?: Record<string, number>;
  }
) => {
  const result = await Result.findOneAndUpdate(
    { schoolId, branchId, studentId, term, session },
    { $set: data },
    { new: true }
  );
  if (!result) throw ApiError.notFound('Result not found');

  await logAudit({
    schoolId, branchId, actorId,
    action: 'RESULT_EXTRAS_UPDATED', entity: 'Result',
    entityId: (result._id as any).toString(),
  });

  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// GET STUDENT FULL 3-TERM RESULT
// ─────────────────────────────────────────────────────────────────────────────
export const getStudentFullResult = async (
  schoolId: string,
  branchId: string,
  studentId: string,
  session: string
) => {
  const [student, first, second, third] = await Promise.all([
    User.findById(studentId).select('firstName lastName admissionNumber').lean(),
    Result.findOne({ schoolId, branchId, studentId, session, term: 'first' }).lean(),
    Result.findOne({ schoolId, branchId, studentId, session, term: 'second' }).lean(),
    Result.findOne({ schoolId, branchId, studentId, session, term: 'third' }).lean(),
  ]);

  return { student, session, firstTerm: first, secondTerm: second, thirdTerm: third };
};

// import { v4 as uuidv4 } from 'uuid';
// import dayjs from 'dayjs';
// import { Result, getNigerianGrade, ISubjectScore } from '../../shared/models/Result';
// import { Branch } from '../../shared/models/Branch';
// import { User } from '../../shared/models/User';
// import { Attendance } from '../../shared/models/Attendance';
// import { ApiError } from '../../shared/utils/ApiError';
// import { logAudit } from '../../shared/utils/auditLogger';
// import { sendEmail, resultTokenTemplate } from '../../shared/utils/emailTemplates';
// import { env } from '../../config/env';



// import puppeteer from 'puppeteer';

// // ─────────────────────────────────────────────────────────────────────────────
// // GENERATE REPORT CARD PDF (GOD'S GRACE STYLE)
// // ─────────────────────────────────────────────────────────────────────────────
// export const generateReportCardPDF = async (result: any) => {
//   const browser = await puppeteer.launch({ 
//     headless: true,
//     args: ['--no-sandbox', '--disable-setuid-sandbox'] 
//   });
//   const page = await browser.newPage();

//   // 1. Prepare Subject Rows
//   const scores = result.scores instanceof Map ? result.scores : new Map(Object.entries(result.scores));
//   const scoreRows = ([...(scores.entries() as any)] as [string, any][]).map(([subject, s]: [string, any]) => `
//     <tr>
//       <td style="text-align: left;">${subject}</td>
//       <td>${s.ca1 || 0}</td>
//       <td>${s.ca2 || 0}</td>
//       <td>${s.exam || 0}</td>
//       <td style="font-weight: bold;">${s.termTotal || 0}</td>
//       <td>${s.grade || ''}</td>
//       <td>-</td> <td>${s.classAverage || '-'}</td>
//       <td>${s.remark || ''}</td>
//     </tr>
//   `).join('');

//   // 2. Prepare Affective/Psychomotor Rows
//   const renderTraits = (data: Record<string, number> = {}) => 
//     Object.entries(data).map(([trait, rating]) => `
//       <tr><td>${trait}</td><td>${rating}</td></tr>
//     `).join('');

//   const htmlContent = `
//     <html>
//     <head>
//       <style>
//         @page { size: A4; margin: 10mm; }
//         body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 10px; color: #333; margin: 0; }
//         .header { display: flex; border-bottom: 3px solid #006644; padding-bottom: 10px; align-items: center; }
//         .logo { width: 70px; height: 70px; }
//         .school-name { flex: 1; text-align: center; }
//         .school-name h1 { color: #006644; margin: 0; font-size: 22px; text-transform: uppercase; }
//         .student-photo { width: 70px; height: 80px; border: 1px solid #006644; }
        
//         .sub-header { text-align: center; background: #006644; color: white; padding: 3px; font-weight: bold; margin-top: 5px; }
        
//         .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; border: 1px solid #ddd; margin-top: 5px; }
//         .info-box { border: 0.5px solid #eee; padding: 4px; }
        
//         table { width: 100%; border-collapse: collapse; margin-top: 10px; }
//         th { background: #006644; color: white; border: 1px solid #ddd; padding: 5px; }
//         td { border: 1px solid #ddd; padding: 4px; text-align: center; }
        
//         .traits-container { display: grid; grid-template-columns: 1.2fr 1fr 1.5fr; gap: 10px; margin-top: 15px; }
//         .trait-table th { font-size: 9px; }
        
//         .footer-section { margin-top: 20px; border: 1px solid #ddd; padding: 10px; }
//         .sig-row { display: flex; justify-content: space-between; margin-top: 30px; }
//         .sig-box { border-top: 1px solid #333; width: 180px; text-align: center; padding-top: 5px; }
//       </style>
//     </head>
//     <body>
//       <div class="header">
//         <img src="${result.schoolLogoUrl || ''}" class="logo" />
//         <div class="school-name">
//           <h1>${result.schoolName || "GOD'S GRACE ROYAL SCHOOLS"}</h1>
//           <p style="margin:2px; font-weight:bold;">EDUCATION IS LIGHT</p>
//           <p style="margin:2px;">${result.branchName || ''} Branch</p>
//         </div>
//         <img src="${result.studentPhotoUrl || 'https://via.placeholder.com/70x80'}" class="student-photo" />
//       </div>

//       <div class="sub-header">${result.term.toUpperCase()} TERM EXAMINATION</div>

//       <div class="info-grid">
//         <div class="info-box"><b>Student:</b> ${result.studentId?.firstName} ${result.studentId?.lastName}</div>
//         <div class="info-box"><b>Reg No:</b> ${result.studentId?.admissionNumber || '-'}</div>
//         <div class="info-box"><b>Class:</b> ${result.classId?.name || '-'}</div>
//         <div class="info-box"><b>Total Score:</b> ${result.totalScore}</div>
//         <div class="info-box"><b>Average:</b> ${result.averageScore}%</div>
//         <div class="info-box"><b>Position:</b> ${result.positionInClass || '-'} of ${result.totalStudentsInClass || '-'}</div>
//       </div>

//       <table>
//         <thead>
//           <tr>
//             <th width="25%">SUBJECT</th>
//             <th>TEST 1</th>
//             <th>TEST 2</th>
//             <th>EXAM</th>
//             <th>TOTAL</th>
//             <th>GRADE</th>
//             <th>POS</th>
//             <th>AVG</th>
//             <th>REMARK</th>
//           </tr>
//         </thead>
//         <tbody>
//           ${scoreRows}
//         </tbody>
//       </table>

//       <div class="traits-container">
//         <table class="trait-table">
//           <thead><tr><th colspan="2">AFFECTIVE TRAITS</th></tr></thead>
//           <tbody>${renderTraits(result.affectiveDomain)}</tbody>
//         </table>
        
//         <table class="trait-table">
//           <thead><tr><th colspan="2">PSYCHOMOTOR SKILLS</th></tr></thead>
//           <tbody>${renderTraits(result.psychomotor)}</tbody>
//         </table>

//         <table class="trait-table">
//           <thead><tr><th colspan="3">GRADING KEY</th></tr></thead>
//           <tr style="background:#f9f9f9"><td>75-100</td><td>A1</td><td>Excellent</td></tr>
//           <tr><td>65-74</td><td>B2</td><td>Very Good</td></tr>
//           <tr style="background:#f9f9f9"><td>50-64</td><td>C4-6</td><td>Credit</td></tr>
//           <tr><td>0-39</td><td>F9</td><td>Fail</td></tr>
//         </table>
//       </div>

//       <div class="footer-section">
//         <p><b>Teacher's Comment:</b> ${result.classTeacherComment || 'An excellent performance.'}</p>
//         <p><b>Principal's Comment:</b> ${result.principalComment || 'Keep it up.'}</p>
//         <div class="sig-row">
//           <div class="sig-box">Form Master</div>
//           <div class="sig-box">Principal's Signature/Stamp</div>
//         </div>
//       </div>
//     </body>
//     </html>
//   `;

//   await page.setContent(htmlContent);
//   const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
//   await browser.close();
//   return pdfBuffer;
// };
// // ─────────────────────────────────────────────────────────────────────────────
// // NIGERIAN CUMULATIVE CALCULATION
// //
// // 1st Term: cumulativeAverage = termTotal (no previous terms)
// // 2nd Term: cumulativeAverage = (1st term total + 2nd term total) / 2
// // 3rd Term: cumulativeAverage = (1st + 2nd + 3rd term totals) / 3
// // ─────────────────────────────────────────────────────────────────────────────
// const calculateCumulative = async (
//   schoolId: string,
//   branchId: string,
//   studentId: string,
//   session: string,
//   term: 'first' | 'second' | 'third',
//   subjectId: string,
//   thisTermTotal: number
// ): Promise<{
//   firstTermTotal?: number;
//   secondTermTotal?: number;
//   cumulativeTotal: number;
//   cumulativeAverage: number;
// }> => {
//   if (term === 'first') {
//     return {
//       cumulativeTotal: thisTermTotal,
//       cumulativeAverage: thisTermTotal,
//     };
//   }

//   if (term === 'second') {
//     // Fetch 1st term score for this subject
//     const firstTermResult = await Result.findOne({
//       schoolId, branchId, studentId, session, term: 'first',
//     }).lean();

//     const firstTermTotal = (firstTermResult?.scores as any)?.get?.(subjectId)?.termTotal
//       ?? (firstTermResult?.scores as Map<string, ISubjectScore>)?.get?.(subjectId)?.termTotal
//       ?? 0;

//     const cumulativeTotal = firstTermTotal + thisTermTotal;
//     const cumulativeAverage = Math.round(cumulativeTotal / 2);

//     return { firstTermTotal, cumulativeTotal, cumulativeAverage };
//   }

//   // 3rd term
//   const [firstTermResult, secondTermResult] = await Promise.all([
//     Result.findOne({ schoolId, branchId, studentId, session, term: 'first' }).lean(),
//     Result.findOne({ schoolId, branchId, studentId, session, term: 'second' }).lean(),
//   ]);

//   const getScore = (result: any, sid: string): number => {
//     if (!result?.scores) return 0;
//     const scores = result.scores instanceof Map
//       ? result.scores
//       : new Map(Object.entries(result.scores));
//     return (scores.get(sid) as ISubjectScore)?.termTotal ?? 0;
//   };

//   const firstTermTotal = getScore(firstTermResult, subjectId);
//   const secondTermTotal = getScore(secondTermResult, subjectId);

//   const cumulativeTotal = firstTermTotal + secondTermTotal + thisTermTotal;
//   const cumulativeAverage = Math.round(cumulativeTotal / 3);

//   return { firstTermTotal, secondTermTotal, cumulativeTotal, cumulativeAverage };
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // UPSERT ONE SUBJECT SCORE
// // ─────────────────────────────────────────────────────────────────────────────
// export const upsertResult = async (
//   schoolId: string,
//   branchId: string,
//   actorId: string,
//   data: {
//     studentId: string;
//     classId: string;
//     term: 'first' | 'second' | 'third';
//     session: string;
//     subjectId: string;
//     ca1: number;
//     ca2: number;
//     exam: number;
//   }
// ) => {
//   const termTotal = data.ca1 + data.ca2 + data.exam;
//   const { grade, remark } = getNigerianGrade(termTotal);

//   // Calculate Nigerian cumulative
//   const cumulative = await calculateCumulative(
//     schoolId, branchId, data.studentId, data.session, data.term, data.subjectId, termTotal
//   );

//   const { grade: cumulativeGrade, remark: cumulativeRemark } =
//     getNigerianGrade(cumulative.cumulativeAverage);

//   // Fetch branch branding for result header
//   const branch = await Branch.findById(branchId)
//     .select('name principalName principalSignatureUrl logoUrl')
//     .lean();

//   const scoreEntry: ISubjectScore = {
//     ca1: data.ca1,
//     ca2: data.ca2,
//     exam: data.exam,
//     termTotal,
//     firstTermTotal: cumulative.firstTermTotal,
//     secondTermTotal: cumulative.secondTermTotal,
//     cumulativeTotal: cumulative.cumulativeTotal,
//     cumulativeAverage: cumulative.cumulativeAverage,
//     grade,
//     remark,
//     cumulativeGrade,
//     cumulativeRemark,
//   };

//   const result = await Result.findOneAndUpdate(
//     { schoolId, branchId, studentId: data.studentId, term: data.term, session: data.session },
//     {
//       $set: {
//         classId: data.classId,
//         [`scores.${data.subjectId}`]: scoreEntry,
//         principalName: branch?.principalName,
//         principalSignatureUrl: branch?.principalSignatureUrl,
//         schoolLogoUrl: branch?.logoUrl,
//         branchName: branch?.name,
//       },
//     },
//     { upsert: true, new: true }
//   );

//   // Recalculate result totals after update
//   await recalculateTotals(result._id.toString());

//   await logAudit({
//     schoolId, branchId, actorId,
//     action: 'RESULT_SCORE_UPSERTED', entity: 'Result',
//     entityId: result._id.toString(),
//     metadata: { studentId: data.studentId, term: data.term, session: data.session, subjectId: data.subjectId },
//   });

//   return Result.findById(result._id).lean();
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // RECALCULATE TOTALS (called after each subject entry)
// // ─────────────────────────────────────────────────────────────────────────────
// const recalculateTotals = async (resultId: string): Promise<void> => {
//   const result = await Result.findById(resultId);
//   if (!result) return;

//   const scoresMap = result.scores as Map<string, ISubjectScore>;
//   const allScores = Array.from(scoresMap.values());

//   if (allScores.length === 0) return;

//   const totalScore = allScores.reduce((sum, s) => sum + s.termTotal, 0);
//   const averageScore = Math.round(totalScore / allScores.length);
//   const numberOfSubjects = allScores.length;

//   await Result.findByIdAndUpdate(resultId, {
//     totalScore,
//     averageScore,
//     numberOfSubjects,
//   });
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // BULK UPSERT — Multiple subjects at once
// // ─────────────────────────────────────────────────────────────────────────────
// export const bulkUpsert = async (
//   schoolId: string,
//   branchId: string,
//   actorId: string,
//   entries: {
//     studentId: string;
//     classId: string;
//     term: 'first' | 'second' | 'third';
//     session: string;
//     subjectId: string;
//     ca1: number;
//     ca2: number;
//     exam: number;
//   }[]
// ) => {
//   const results = [];
//   for (const entry of entries) {
//     const r = await upsertResult(schoolId, branchId, actorId, entry);
//     results.push(r);
//   }
//   return results;
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // UPDATE NON-SCORE FIELDS (comments, affective, psychomotor, attendance)
// // ─────────────────────────────────────────────────────────────────────────────
// export const updateResultExtras = async (
//   schoolId: string,
//   branchId: string,
//   actorId: string,
//   studentId: string,
//   term: string,
//   session: string,
//   data: {
//     classTeacherComment?: string;
//     principalComment?: string;
//     classTeacherName?: string;
//     promotionStatus?: 'promoted' | 'repeated' | 'pending';
//     nextTermBegins?: string;
//     termDaysPresent?: number;
//     termDaysAbsent?: number;
//     termTotalDays?: number;
//     affectiveDomain?: Record<string, number>;
//     psychomotor?: Record<string, number>;
//   }
// ) => {
//   const result = await Result.findOneAndUpdate(
//     { schoolId, branchId, studentId, term, session },
//     { $set: data },
//     { new: true }
//   );
//   if (!result) throw ApiError.notFound('Result not found');

//   await logAudit({
//     schoolId, branchId, actorId,
//     action: 'RESULT_EXTRAS_UPDATED', entity: 'Result',
//     entityId: result._id.toString(),
//   });

//   return result;
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // COMPUTE CLASS POSITIONS — Run after all results for a class are entered
// // ─────────────────────────────────────────────────────────────────────────────
// export const computeClassPositions = async (
//   schoolId: string,
//   branchId: string,
//   classId: string,
//   term: string,
//   session: string,
//   actorId: string
// ) => {
//   // Fetch all results for this class/term/session
//   const results = await Result.find({ schoolId, branchId, classId, term, session });

//   if (results.length === 0) throw ApiError.notFound('No results found for this class and term');

//   // Sort by averageScore descending
//   const sorted = [...results].sort((a, b) => b.averageScore - a.averageScore);
//   const totalStudents = sorted.length;

//   const averages = sorted.map((r) => r.averageScore);
//   const highestInClass = averages[0];
//   const lowestInClass = averages[averages.length - 1];
//   const classAverage = Math.round(averages.reduce((s, a) => s + a, 0) / averages.length);

//   // Assign positions (handle ties — same average = same position)
//   const updates = sorted.map((result, idx) => {
//     const position = idx === 0
//       ? 1
//       : result.averageScore === sorted[idx - 1].averageScore
//         ? results.find((r) => r._id.equals(sorted[idx - 1]._id))?.positionInClass || idx + 1
//         : idx + 1;

//     return Result.findByIdAndUpdate(result._id, {
//       positionInClass: position,
//       totalStudentsInClass: totalStudents,
//       highestInClass,
//       lowestInClass,
//       classAverage,
//     });
//   });

//   await Promise.all(updates);

//   await logAudit({
//     schoolId, branchId, actorId,
//     action: 'CLASS_POSITIONS_COMPUTED', entity: 'Result',
//     metadata: { classId, term, session, totalStudents },
//   });

//   return { computed: totalStudents, highestInClass, lowestInClass, classAverage };
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // MARK PAID
// // ─────────────────────────────────────────────────────────────────────────────
// export const markPaid = async (
//   schoolId: string,
//   branchId: string,
//   actorId: string,
//   studentId: string,
//   term: string,
//   session: string
// ) => {
//   const result = await Result.findOneAndUpdate(
//     { schoolId, branchId, studentId, term, session },
//     { isPaid: true, dateIssued: new Date() },
//     { new: true }
//   );
//   if (!result) throw ApiError.notFound('Result not found');

//   await logAudit({
//     schoolId, branchId, actorId,
//     action: 'RESULT_MARKED_PAID', entity: 'Result', entityId: result._id.toString(),
//   });

//   return result;
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // GENERATE TOKEN & EMAIL TO PARENT
// // ─────────────────────────────────────────────────────────────────────────────
// export const generateToken = async (
//   schoolId: string,
//   branchId: string,
//   studentId: string,
//   term: string,
//   session: string
// ) => {
//   const result = await Result.findOne({ schoolId, branchId, studentId, term, session });
//   if (!result) throw ApiError.notFound('Result not found');
//   if (!result.isPaid) throw new ApiError(402, 'Result access is not paid. Please complete payment first.');

//   const token = uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase();
//   result.token = token;
//   result.tokenGeneratedAt = new Date();
//   await result.save();

//   // Send token to parent(s)
//   const [student, branch] = await Promise.all([
//     User.findById(studentId).select('firstName lastName').lean(),
//     Branch.findById(branchId).select('name logoUrl').lean(),
//   ]);

//   const parents = await User.find({
//     linkedStudents: studentId, role: 'parent', isActive: true,
//     email: { $exists: true, $ne: '' },
//   }).select('email firstName').lean();

//   for (const parent of parents) {
//     const { subject, html } = resultTokenTemplate({
//       recipientName: parent.firstName,
//       studentName: `${student?.firstName} ${student?.lastName}`,
//       term: term.charAt(0).toUpperCase() + term.slice(1),
//       session,
//       token,
//       schoolName: result.schoolName || '',
//       branchName: branch?.name || '',
//       checkResultUrl: `${env.FRONTEND_URL}/results/view?token=${token}`,
//       logoUrl: (branch as any)?.logoUrl,
//     });
//     await sendEmail(parent.email!, subject, html);
//   }

//   return { token, sentToParents: parents.length };
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // VIEW RESULT VIA TOKEN
// // ─────────────────────────────────────────────────────────────────────────────
// export const viewResult = async (
//   schoolId: string,
//   branchId: string,
//   studentId: string,
//   term: string,
//   session: string,
//   token: string
// ) => {
//   const result = await Result.findOne({ schoolId, branchId, studentId, term, session })
//     .populate('studentId', 'firstName lastName admissionNumber')
//     .populate('classId', 'name category')
//     .lean();

//   if (!result) throw ApiError.notFound('Result not found');
//   if (result.token !== token) throw ApiError.unauthorized('Invalid result token');

//   return result;
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // PUBLISH RESULTS (all results for a term/session become visible)
// // ─────────────────────────────────────────────────────────────────────────────
// export const publishResults = async (
//   schoolId: string,
//   branchId: string,
//   actorId: string,
//   term: string,
//   session: string
// ) => {
//   const updated = await Result.updateMany(
//     { schoolId, branchId, term, session, publishedAt: { $exists: false } },
//     { publishedAt: new Date() }
//   );

//   await logAudit({
//     schoolId, branchId, actorId,
//     action: 'RESULTS_PUBLISHED', entity: 'Result',
//     metadata: { term, session, count: updated.modifiedCount },
//   });

//   return { published: updated.modifiedCount };
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // GET STUDENT FULL RESULT — All three terms side by side
// // ─────────────────────────────────────────────────────────────────────────────
// export const getStudentFullResult = async (
//   schoolId: string,
//   branchId: string,
//   studentId: string,
//   session: string
// ) => {
//   const [first, second, third] = await Promise.all([
//     Result.findOne({ schoolId, branchId, studentId, session, term: 'first' })
//       .populate('classId', 'name').lean(),
//     Result.findOne({ schoolId, branchId, studentId, session, term: 'second' })
//       .populate('classId', 'name').lean(),
//     Result.findOne({ schoolId, branchId, studentId, session, term: 'third' })
//       .populate('classId', 'name').lean(),
//   ]);

//   const student = await User.findById(studentId)
//     .select('firstName lastName admissionNumber').lean();

//   return {
//     student,
//     session,
//     firstTerm: first || null,
//     secondTerm: second || null,
//     thirdTerm: third || null,
//   };
// };

// // (generateReportCardPDF defined above; download helper follows)
// export const downloadResultAsPDF = async (
//   schoolId: string,
//   branchId: string,
//   studentId: string,
//   term: string,
//   session: string,
//   token?: string
// ) => {
//   const result = await Result.findOne({ schoolId, branchId, studentId, term, session })
//     .populate('studentId', 'firstName lastName admissionNumber photoUrl')
//     .populate('classId', 'name')
//     .lean();

//   if (!result) throw ApiError.notFound('Result not found');

//   if (token) {
//     if (result.token !== token) throw ApiError.unauthorized('Invalid result token');
//   } else {
//     if (!result.isPaid) throw new ApiError(402, 'Result access is not paid. Please complete payment first.');
//   }

//   const pdfBuffer = await generateReportCardPDF(result as any);
//   return pdfBuffer;
// };