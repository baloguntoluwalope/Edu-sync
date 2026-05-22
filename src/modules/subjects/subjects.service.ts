import { Subject } from '../../shared/models/Subject';
import { Class } from '../../shared/models/Class';
import { ApiError } from '../../shared/utils/ApiError';
import { logAudit } from '../../shared/utils/auditLogger';
import { redisCacheOrFetch, redisDel } from '../../config/redis';

/**
 * NOTE: Default subjects are AUTO-CREATED by EduSync when a school/branch is registered.
 * These service functions only handle CUSTOM subjects that admins add on top of defaults.
 */
export const createSubject = async (
  schoolId: string,
  branchId: string,
  actorId: string,
  data: { name: string; classId: string; code?: string; teacherId?: string }
) => {
  const cls = await Class.findOne({ _id: data.classId, schoolId, branchId });
  if (!cls) throw ApiError.notFound('Class not found in this branch');

  const exists = await Subject.findOne({
    schoolId, branchId, classId: data.classId,
    name: { $regex: `^${data.name}$`, $options: 'i' },
  });
  if (exists) {
    throw ApiError.conflict(
      `Subject "${data.name}" already exists for this class. ` +
      `EduSync auto-creates default subjects on setup — check the subject list first.`
    );
  }

  const subject = await Subject.create({
    schoolId, branchId, isDefault: false, ...data,
  });

  await redisDel(`subjects:${branchId}:${data.classId}`);
  await redisDel(`subjects:all:${branchId}`);

  await logAudit({
    schoolId, branchId, actorId,
    action: 'CUSTOM_SUBJECT_CREATED',
    entity: 'Subject',
    entityId: (subject._id as any).toString(),
    metadata: { name: data.name, classId: data.classId, note: 'Admin-added custom subject' },
  });

  return subject;
};

export const bulkCreateSubjects = async (
  schoolId: string,
  branchId: string,
  actorId: string,
  classId: string,
  names: string[]
) => {
  const cls = await Class.findOne({ _id: classId, schoolId, branchId });
  if (!cls) throw ApiError.notFound('Class not found');

  const existing = await Subject.find({ schoolId, branchId, classId }).select('name').lean();
  const existingNames = existing.map((s) => s.name.toLowerCase());

  const toCreate = names
    .filter((n) => !existingNames.includes(n.toLowerCase()))
    .map((name) => ({ schoolId, branchId, classId, name, isDefault: false }));

  if (toCreate.length === 0) {
    throw ApiError.conflict(
      'All subjects in this list already exist for this class. ' +
      'Remember EduSync auto-creates the default subjects on setup.'
    );
  }

  const subjects = await Subject.insertMany(toCreate);

  await redisDel(`subjects:${branchId}:${classId}`);
  await redisDel(`subjects:all:${branchId}`);

  await logAudit({
    schoolId, branchId, actorId,
    action: 'CUSTOM_SUBJECTS_BULK_CREATED', entity: 'Subject',
    metadata: { classId, count: subjects.length, note: 'Admin-added custom subjects' },
  });

  return { created: subjects.length, skipped: names.length - subjects.length, subjects };
};

export const listSubjectsByClass = async (
  schoolId: string, branchId: string, classId: string
) => {
  return redisCacheOrFetch(`subjects:${branchId}:${classId}`, 300, () =>
    Subject.find({ schoolId, branchId, classId, isActive: true })
      .populate('teacherId', 'firstName lastName staffId')
      .lean()
  );
};

export const listAllSubjects = async (schoolId: string, branchId: string) => {
  return redisCacheOrFetch(`subjects:all:${branchId}`, 300, () =>
    Subject.find({ schoolId, branchId, isActive: true })
      .populate('classId', 'name category')
      .populate('teacherId', 'firstName lastName staffId')
      .lean()
  );
};

export const getSubject = async (schoolId: string, branchId: string, subjectId: string) => {
  const subject = await Subject.findOne({ _id: subjectId, schoolId, branchId })
    .populate('classId', 'name category')
    .populate('teacherId', 'firstName lastName staffId email')
    .lean();
  if (!subject) throw ApiError.notFound('Subject not found');
  return subject;
};

export const updateSubject = async (
  schoolId: string,
  branchId: string,
  subjectId: string,
  actorId: string,
  data: Partial<{ name: string; code: string; teacherId: string; isActive: boolean }>
) => {
  const subject = await Subject.findOneAndUpdate(
    { _id: subjectId, schoolId, branchId },
    data,
    { new: true, runValidators: true }
  );
  if (!subject) throw ApiError.notFound('Subject not found');

  await redisDel(`subjects:${branchId}:${(subject.classId as any).toString()}`);
  await redisDel(`subjects:all:${branchId}`);

  await logAudit({
    schoolId, branchId, actorId,
    action: 'SUBJECT_UPDATED', entity: 'Subject', entityId: subjectId,
  });

  return subject;
};

export const assignTeacherToSubject = async (
  schoolId: string,
  branchId: string,
  subjectId: string,
  teacherId: string,
  actorId: string
) => {
  const subject = await Subject.findOneAndUpdate(
    { _id: subjectId, schoolId, branchId },
    { teacherId },
    { new: true }
  );
  if (!subject) throw ApiError.notFound('Subject not found');

  await redisDel(`subjects:${branchId}:${(subject.classId as any).toString()}`);
  await redisDel(`subjects:all:${branchId}`);

  await logAudit({
    schoolId, branchId, actorId,
    action: 'SUBJECT_TEACHER_ASSIGNED', entity: 'Subject', entityId: subjectId,
    metadata: { teacherId },
  });

  return subject;
};

export const deleteSubject = async (
  schoolId: string,
  branchId: string,
  subjectId: string,
  actorId: string
) => {
  const subject = await Subject.findOne({ _id: subjectId, schoolId, branchId });
  if (!subject) throw ApiError.notFound('Subject not found');

  if (subject.isDefault) {
    throw ApiError.badRequest(
      'Cannot delete a default subject created by EduSync. ' +
      'You can deactivate it instead using the update endpoint with { "isActive": false }.'
    );
  }

  await Subject.findByIdAndUpdate(subjectId, { isActive: false });

  await redisDel(`subjects:${branchId}:${(subject.classId as any).toString()}`);
  await redisDel(`subjects:all:${branchId}`);

  await logAudit({
    schoolId, branchId, actorId,
    action: 'CUSTOM_SUBJECT_DELETED', entity: 'Subject', entityId: subjectId,
  });

  return { deleted: true };
};