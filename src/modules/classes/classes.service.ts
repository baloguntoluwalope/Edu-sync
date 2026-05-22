import { Class } from '../../shared/models/Class';
import { Subject } from '../../shared/models/Subject';
import { User } from '../../shared/models/User';
import { ApiError } from '../../shared/utils/ApiError';
import { logAudit } from '../../shared/utils/auditLogger';
import { redisCacheOrFetch, redisDel } from '../../config/redis';
import { getPagination, paginatedResponse } from '../../shared/utils/pagination';

/**
 * NOTE: Standard classes (KG1–SS3) are AUTO-CREATED by EduSync when a school
 * or branch is registered. This createClass function only exists for admins
 * who need a custom/non-standard class beyond the defaults.
 */
export const createClass = async (
  schoolId: string,
  branchId: string,
  actorId: string,
  data: {
    name: string;
    category: 'KG' | 'Nursery' | 'Primary' | 'JSS' | 'SSS';
    formTeacherId?: string;
  }
) => {
  const exists = await Class.findOne({ schoolId, branchId, name: data.name });
  if (exists) {
    throw ApiError.conflict(
      `Class "${data.name}" already exists in this branch. ` +
      `EduSync auto-creates all standard classes on setup — check your class list first.`
    );
  }

  const cls = await Class.create({ schoolId, branchId, ...data });

  await redisDel(`classes:${branchId}`);

  await logAudit({
    schoolId, branchId, actorId,
    action: 'CUSTOM_CLASS_CREATED',
    entity: 'Class',
    entityId: (cls._id as any).toString(),
    metadata: { name: data.name, category: data.category, note: 'Admin-added custom class' },
  });

  return cls;
};

export const listClasses = async (schoolId: string, branchId: string) => {
  return redisCacheOrFetch(`classes:${branchId}`, 300, () =>
    Class.find({ schoolId, branchId, isActive: true })
      .populate('formTeacherId', 'firstName lastName staffId')
      .sort({ category: 1, name: 1 })
      .lean()
  );
};

export const getClass = async (schoolId: string, branchId: string, classId: string) => {
  const cls = await Class.findOne({ _id: classId, schoolId, branchId })
    .populate('formTeacherId', 'firstName lastName staffId email')
    .lean();
  if (!cls) throw ApiError.notFound('Class not found');

  const [subjects, studentCount] = await Promise.all([
    Subject.find({ schoolId, branchId, classId, isActive: true })
      .populate('teacherId', 'firstName lastName staffId')
      .lean(),
    User.countDocuments({ _id: { $in: cls.studentIds }, role: 'student', isActive: true }),
  ]);

  return { cls, subjects, studentCount };
};

export const updateClass = async (
  schoolId: string,
  branchId: string,
  classId: string,
  actorId: string,
  data: Partial<{
    name: string;
    formTeacherId: string;
    isActive: boolean;
  }>
) => {
  const cls = await Class.findOneAndUpdate(
    { _id: classId, schoolId, branchId },
    data,
    { new: true, runValidators: true }
  );
  if (!cls) throw ApiError.notFound('Class not found');

  await redisDel(`classes:${branchId}`);

  await logAudit({
    schoolId, branchId, actorId,
    action: 'CLASS_UPDATED', entity: 'Class', entityId: classId,
  });

  return cls;
};

export const addStudentsToClass = async (
  schoolId: string,
  branchId: string,
  classId: string,
  actorId: string,
  studentIds: string[]
) => {
  const cls = await Class.findOne({ _id: classId, schoolId, branchId });
  if (!cls) throw ApiError.notFound('Class not found');

  // Move students out of any other class in this branch
  await Class.updateMany(
    { schoolId, branchId, _id: { $ne: classId } },
    { $pullAll: { studentIds } }
  );

  await Class.findByIdAndUpdate(classId, {
    $addToSet: { studentIds: { $each: studentIds } },
  });

  await logAudit({
    schoolId, branchId, actorId,
    action: 'STUDENTS_ADDED_TO_CLASS', entity: 'Class', entityId: classId,
    metadata: { count: studentIds.length },
  });

  return { added: studentIds.length };
};

export const removeStudentFromClass = async (
  schoolId: string,
  branchId: string,
  classId: string,
  actorId: string,
  studentId: string
) => {
  await Class.findOneAndUpdate(
    { _id: classId, schoolId, branchId },
    { $pull: { studentIds: studentId } }
  );

  await logAudit({
    schoolId, branchId, actorId,
    action: 'STUDENT_REMOVED_FROM_CLASS', entity: 'Class', entityId: classId,
    metadata: { studentId },
  });

  return { removed: true };
};

export const getClassStudents = async (
  schoolId: string,
  branchId: string,
  classId: string,
  page = 1,
  limit = 30
) => {
  const cls = await Class.findOne({ _id: classId, schoolId, branchId });
  if (!cls) throw ApiError.notFound('Class not found');

  const { skip } = getPagination(page, limit);
  const [data, total] = await Promise.all([
    User.find({ _id: { $in: cls.studentIds }, isActive: true })
      .select('-passwordHash')
      .skip(skip).limit(limit).lean(),
    User.countDocuments({ _id: { $in: cls.studentIds }, isActive: true }),
  ]);

  return paginatedResponse(data, total, page, limit);
};