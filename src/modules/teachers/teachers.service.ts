import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';
import { User } from '../../shared/models/User';
import { Class } from '../../shared/models/Class';
import { Subject } from '../../shared/models/Subject';
import { Branch } from '../../shared/models/Branch';
import { ApiError } from '../../shared/utils/ApiError';
import { getPagination, paginatedResponse } from '../../shared/utils/pagination';
import { logAudit } from '../../shared/utils/auditLogger';
import { sendEmail } from '../../config/mailer';
import { teacherWelcomeTemplate } from '../../shared/utils/emailTemplates';
import { deleteCloudinaryFile } from '../../config/cloudinary';
import { redisDel } from '../../config/redis';
import { env } from '../../config/env';
 import { generateQRCode } from '../../shared/utils/qrCodeGenerator';


// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface CreateTeacherData {
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phone: string;
  gender: 'male' | 'female';
  dateOfBirth: string;
  password: string;
  homeAddress: string;
  city: string;
  state: string;
  nationality?: string;
  stateOfOrigin?: string;
  lgaOfOrigin?: string;
  religion?: string;
  qualification: string;
  specialization?: string;
  yearsOfExperience?: number;
  assignedClassIds?: string[];
  assignedSubjectIds?: string[];
}

interface UpdateTeacherData {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  homeAddress?: string;
  city?: string;
  state?: string;
  nationality?: string;
  stateOfOrigin?: string;
  lgaOfOrigin?: string;
  religion?: string;
  qualification?: string;
  specialization?: string;
  yearsOfExperience?: number;
  isActive?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const generateStaffId = (): string => {
  const year = new Date().getFullYear().toString().slice(2);
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `TCH-${year}-${rand}`;
};

const sanitizeTeacher = (teacher: any): Record<string, unknown> => {
  const {
    passwordHash,
    profileImagePublicId,
    passportPublicId,
    __v,
    ...safe
  } = teacher;
  return safe;
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE TEACHER
// ─────────────────────────────────────────────────────────────────────────────
export const createTeacher = async (
  schoolId: string,
  branchId: string,
  actorId: string,
  data: CreateTeacherData
): Promise<{ teacher: Record<string, unknown>; staffId: string; message: string }> => {

  // Validate branch exists
  const branch = await Branch.findOne({ _id: branchId, schoolId, isActive: true })
    .select('name logoUrl')
    .lean();
  if (!branch) throw ApiError.notFound('Branch not found');

  // Check email uniqueness within school
  const emailExists = await User.findOne({
    schoolId,
    email: data.email.toLowerCase().trim(),
  }).lean();
  if (emailExists) throw ApiError.conflict('A user with this email already exists in this school');

  // Check phone uniqueness within school
  const phoneExists = await User.findOne({
    schoolId,
    phone: data.phone.trim(),
  }).lean();
  if (phoneExists) throw ApiError.conflict('A user with this phone number already exists in this school');

  // Validate assigned class IDs if provided
  if (data.assignedClassIds?.length) {
    const validClasses = await Class.countDocuments({
      _id: { $in: data.assignedClassIds },
      schoolId,
      branchId,
    });
    if (validClasses !== data.assignedClassIds.length) {
      throw ApiError.badRequest('One or more class IDs are invalid for this branch');
    }
  }

  // Validate assigned subject IDs if provided
  if (data.assignedSubjectIds?.length) {
    const validSubjects = await Subject.countDocuments({
      _id: { $in: data.assignedSubjectIds },
      schoolId,
      branchId,
    });
    if (validSubjects !== data.assignedSubjectIds.length) {
      throw ApiError.badRequest('One or more subject IDs are invalid for this branch');
    }
  }

  const staffId = generateStaffId();
  const passwordHash = await bcrypt.hash(data.password, 12);

  // Create teacher
  const teacher = await User.create({
    schoolId,
    branchId,
    role: 'teacher',
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    middleName: data.middleName?.trim(),
    email: data.email.toLowerCase().trim(),
    phone: data.phone.trim(),
    gender: data.gender,
    dateOfBirth: new Date(data.dateOfBirth),
    homeAddress: data.homeAddress.trim(),
    city: data.city.trim(),
    state: data.state.trim(),
    nationality: data.nationality?.trim() || 'Nigerian',
    stateOfOrigin: data.stateOfOrigin?.trim(),
    lgaOfOrigin: data.lgaOfOrigin?.trim(),
    religion: data.religion?.trim(),
    qualification: data.qualification.trim(),
    specialization: data.specialization?.trim(),
    yearsOfExperience: data.yearsOfExperience,
    passwordHash,
    staffId,
    isActive: true,
    isEmailVerified: false,
    notificationPrefs: { email: true, inApp: true, sms: false },
  });
    

 
// After teacher is created
const teacherId = (teacher._id as any).toString();
const teacherQR = await generateQRCode({
  type: 'teacher',
  id: teacherId,
  schoolId,
  branchId,
  identifier: staffId,
  name: `${data.firstName} ${data.lastName}`,
});

await User.findByIdAndUpdate(teacher._id, {
  qrCodeData: teacherQR.qrCodeData,
  qrCodeUrl: teacherQR.qrCodeUrl,
});

  // Assign as form teacher to classes
  if (data.assignedClassIds?.length) {
    await Class.updateMany(
      { _id: { $in: data.assignedClassIds }, schoolId, branchId },
      { formTeacherId: teacher._id }
    );
  }

  // Assign teacher to subjects
  if (data.assignedSubjectIds?.length) {
    await Subject.updateMany(
      { _id: { $in: data.assignedSubjectIds }, schoolId, branchId },
      { teacherId: teacher._id }
    );
  }

  // Invalidate teacher list cache
  await redisDel(`teachers:${branchId}`);

  // Send welcome email with login credentials
  try {
    const { subject, html } = teacherWelcomeTemplate({
      firstName: data.firstName,
      schoolName: branch.name,
      branchName: branch.name,
      email: data.email,
      password: data.password,
      staffId,
      loginUrl: `${env.FRONTEND_URL}/login`,
      logoUrl: branch.logoUrl,
    });
    await sendEmail(data.email, subject, html);
  } catch {
    // Email failure should not break teacher creation
  }

  await logAudit({
    schoolId,
    branchId,
    actorId,
    action: 'TEACHER_CREATED',
    entity: 'User',
    entityId: teacherId,
    metadata: {
      staffId,
      email: data.email,
      name: `${data.firstName} ${data.lastName}`,
    },
  });

  return {
    teacher: sanitizeTeacher(teacher.toObject()),
    staffId,
    message: 'Teacher created successfully. Login credentials sent to their email.',
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// LIST TEACHERS
// ─────────────────────────────────────────────────────────────────────────────
export const listTeachers = async (
  schoolId: string,
  branchId: string,
  page = 1,
  limit = 20,
  search?: string,
  isActive?: boolean
) => {
  const { skip } = getPagination(page, limit);

  const query: Record<string, unknown> = {
    schoolId,
    branchId,
    role: 'teacher',
  };

  if (typeof isActive === 'boolean') {
    query.isActive = isActive;
  }

  if (search?.trim()) {
    query.$or = [
      { firstName: { $regex: search.trim(), $options: 'i' } },
      { lastName: { $regex: search.trim(), $options: 'i' } },
      { middleName: { $regex: search.trim(), $options: 'i' } },
      { email: { $regex: search.trim(), $options: 'i' } },
      { phone: { $regex: search.trim(), $options: 'i' } },
      { staffId: { $regex: search.trim(), $options: 'i' } },
      { qualification: { $regex: search.trim(), $options: 'i' } },
      { specialization: { $regex: search.trim(), $options: 'i' } },
    ];
  }

  const [data, total] = await Promise.all([
    User.find(query)
      .select('-passwordHash -profileImagePublicId -passportPublicId -__v')
      .sort({ lastName: 1, firstName: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  return paginatedResponse(data, total, page, limit);
};

// ─────────────────────────────────────────────────────────────────────────────
// GET SINGLE TEACHER
// ─────────────────────────────────────────────────────────────────────────────
export const getTeacher = async (
  schoolId: string,
  branchId: string,
  teacherId: string
) => {
  const teacher = await User.findOne({
    _id: teacherId,
    schoolId,
    branchId,
    role: 'teacher',
  })
    .select('-passwordHash -profileImagePublicId -passportPublicId -__v')
    .lean();

  if (!teacher) throw ApiError.notFound('Teacher not found');

  // Get assigned classes and subjects in parallel
  const [assignedClasses, assignedSubjects] = await Promise.all([
    Class.find({ schoolId, branchId, formTeacherId: teacherId })
      .select('name category studentIds isActive')
      .lean(),
    Subject.find({ schoolId, branchId, teacherId })
      .select('name code classId isDefault isActive')
      .populate('classId', 'name category')
      .lean(),
  ]);

  // Calculate age from date of birth
  const age = teacher.dateOfBirth
    ? dayjs().diff(dayjs(teacher.dateOfBirth), 'year')
    : null;

  // Total students across all assigned classes
  const totalStudents = assignedClasses.reduce(
    (sum, cls) => sum + (cls.studentIds?.length || 0),
    0
  );

  return {
    teacher: { ...teacher, age },
    assignedClasses,
    assignedSubjects,
    summary: {
      totalClasses: assignedClasses.length,
      totalSubjects: assignedSubjects.length,
      totalStudents,
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE TEACHER
// ─────────────────────────────────────────────────────────────────────────────
export const updateTeacher = async (
  schoolId: string,
  branchId: string,
  teacherId: string,
  actorId: string,
  data: UpdateTeacherData
) => {
  // Check teacher exists
  const existing = await User.findOne({
    _id: teacherId, schoolId, branchId, role: 'teacher',
  }).lean();
  if (!existing) throw ApiError.notFound('Teacher not found');

  // Check phone uniqueness if phone is being changed
  if (data.phone && data.phone.trim() !== existing.phone) {
    const phoneExists = await User.findOne({
      schoolId,
      phone: data.phone.trim(),
      _id: { $ne: teacherId },
    }).lean();
    if (phoneExists) {
      throw ApiError.conflict('This phone number is already used by another user in this school');
    }
  }

  // Build clean update object
  const updatePayload: Record<string, unknown> = {};

  if (data.firstName) updatePayload.firstName = data.firstName.trim();
  if (data.lastName) updatePayload.lastName = data.lastName.trim();
  if (data.middleName !== undefined) updatePayload.middleName = data.middleName?.trim();
  if (data.phone) updatePayload.phone = data.phone.trim();
  if (data.gender) updatePayload.gender = data.gender;
  if (data.dateOfBirth) updatePayload.dateOfBirth = new Date(data.dateOfBirth);
  if (data.homeAddress) updatePayload.homeAddress = data.homeAddress.trim();
  if (data.city) updatePayload.city = data.city.trim();
  if (data.state) updatePayload.state = data.state.trim();
  if (data.nationality) updatePayload.nationality = data.nationality.trim();
  if (data.stateOfOrigin !== undefined) updatePayload.stateOfOrigin = data.stateOfOrigin?.trim();
  if (data.lgaOfOrigin !== undefined) updatePayload.lgaOfOrigin = data.lgaOfOrigin?.trim();
  if (data.religion !== undefined) updatePayload.religion = data.religion?.trim();
  if (data.qualification) updatePayload.qualification = data.qualification.trim();
  if (data.specialization !== undefined) updatePayload.specialization = data.specialization?.trim();
  if (data.yearsOfExperience !== undefined) updatePayload.yearsOfExperience = data.yearsOfExperience;
  if (typeof data.isActive === 'boolean') updatePayload.isActive = data.isActive;

  const updated = await User.findByIdAndUpdate(
    teacherId,
    { $set: updatePayload },
    { new: true, runValidators: true }
  )
    .select('-passwordHash -profileImagePublicId -passportPublicId -__v')
    .lean();

  if (!updated) throw ApiError.notFound('Teacher not found');

  await redisDel(`teachers:${branchId}`);

  await logAudit({
    schoolId,
    branchId,
    actorId,
    action: 'TEACHER_UPDATED',
    entity: 'User',
    entityId: teacherId,
    metadata: { updatedFields: Object.keys(updatePayload) },
  });

  return updated;
};

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGN TEACHER TO CLASSES
// ─────────────────────────────────────────────────────────────────────────────
export const assignTeacherToClasses = async (
  schoolId: string,
  branchId: string,
  actorId: string,
  teacherId: string,
  classIds: string[]
) => {
  // Confirm teacher exists and belongs to this branch
  const teacher = await User.findOne({
    _id: teacherId, schoolId, branchId, role: 'teacher', isActive: true,
  }).select('firstName lastName').lean();
  if (!teacher) throw ApiError.notFound('Teacher not found or is inactive');

  // Confirm all classes belong to this branch
  const classes = await Class.find({
    _id: { $in: classIds }, schoolId, branchId,
  }).select('name category').lean();

  if (classes.length !== classIds.length) {
    throw ApiError.badRequest('One or more class IDs are invalid for this branch');
  }

  // Remove this teacher as form teacher from their current classes
  await Class.updateMany(
    { schoolId, branchId, formTeacherId: teacherId },
    { $unset: { formTeacherId: '' } }
  );

  // Assign to new classes
  await Class.updateMany(
    { _id: { $in: classIds }, schoolId, branchId },
    { $set: { formTeacherId: teacherId } }
  );

  await logAudit({
    schoolId,
    branchId,
    actorId,
    action: 'TEACHER_CLASSES_ASSIGNED',
    entity: 'User',
    entityId: teacherId,
    metadata: {
      teacherName: `${teacher.firstName} ${teacher.lastName}`,
      classIds,
      classNames: classes.map((c) => c.name),
    },
  });

  return {
    assigned: classes.length,
    classes: classes.map((c) => ({
      id: (c._id as any).toString(),
      name: c.name,
      category: c.category,
    })),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGN TEACHER TO SUBJECTS
// ─────────────────────────────────────────────────────────────────────────────
export const assignTeacherToSubjects = async (
  schoolId: string,
  branchId: string,
  actorId: string,
  teacherId: string,
  subjectIds: string[]
) => {
  // Confirm teacher exists
  const teacher = await User.findOne({
    _id: teacherId, schoolId, branchId, role: 'teacher', isActive: true,
  }).select('firstName lastName').lean();
  if (!teacher) throw ApiError.notFound('Teacher not found or is inactive');

  // Confirm all subjects belong to this branch
  const subjects = await Subject.find({
    _id: { $in: subjectIds }, schoolId, branchId,
  })
    .select('name code classId')
    .populate('classId', 'name')
    .lean();

  if (subjects.length !== subjectIds.length) {
    throw ApiError.badRequest('One or more subject IDs are invalid for this branch');
  }

  // Assign teacher to all provided subjects
  await Subject.updateMany(
    { _id: { $in: subjectIds }, schoolId, branchId },
    { $set: { teacherId } }
  );

  await logAudit({
    schoolId,
    branchId,
    actorId,
    action: 'TEACHER_SUBJECTS_ASSIGNED',
    entity: 'User',
    entityId: teacherId,
    metadata: {
      teacherName: `${teacher.firstName} ${teacher.lastName}`,
      subjectIds,
      subjectNames: subjects.map((s) => s.name),
    },
  });

  return {
    assigned: subjects.length,
    subjects: subjects.map((s) => ({
      id: (s._id as any).toString(),
      name: s.name,
      class: (s.classId as any)?.name || null,
    })),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD TEACHER PASSPORT — Admin uploads for a specific teacher
// ─────────────────────────────────────────────────────────────────────────────
export const uploadTeacherPassport = async (
  schoolId: string,
  branchId: string,
  teacherId: string,
  actorId: string,
  fileUrl: string,
  publicId: string
): Promise<{ profileImageUrl: string }> => {
  const teacher = await User.findOne({
    _id: teacherId, schoolId, branchId, role: 'teacher',
  });
  if (!teacher) throw ApiError.notFound('Teacher not found');

  // Delete old passport from Cloudinary before saving new one
  if (teacher.profileImagePublicId) {
    try {
      await deleteCloudinaryFile(teacher.profileImagePublicId);
    } catch {
      // Non-blocking — old file may already be gone
    }
  }

  teacher.profileImageUrl = fileUrl;
  teacher.profileImagePublicId = publicId;
  await teacher.save();

  await redisDel(`teachers:${branchId}`);

  await logAudit({
    schoolId,
    branchId,
    actorId,
    action: 'TEACHER_PASSPORT_UPLOADED',
    entity: 'User',
    entityId: teacherId,
    metadata: {
      fileUrl,
      uploadedBy: actorId,
      isSelfUpload: actorId === teacherId,
    },
  });

  return { profileImageUrl: fileUrl };
};

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD OWN PASSPORT — Teacher uploads their own photo (self-service)
// ─────────────────────────────────────────────────────────────────────────────
export const uploadOwnPassport = async (
  schoolId: string,
  branchId: string,
  teacherId: string,
  fileUrl: string,
  publicId: string
): Promise<{ profileImageUrl: string }> => {
  // Teacher is both actor and subject — reuse the same logic
  return uploadTeacherPassport(
    schoolId,
    branchId,
    teacherId,
    teacherId, // actorId = teacherId (self)
    fileUrl,
    publicId
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// REMOVE TEACHER PASSPORT
// ─────────────────────────────────────────────────────────────────────────────
export const removeTeacherPassport = async (
  schoolId: string,
  branchId: string,
  teacherId: string,
  actorId: string
): Promise<{ removed: boolean }> => {
  const teacher = await User.findOne({
    _id: teacherId, schoolId, branchId, role: 'teacher',
  });
  if (!teacher) throw ApiError.notFound('Teacher not found');

  if (!teacher.profileImagePublicId) {
    throw ApiError.badRequest('This teacher has no passport photo to remove');
  }

  try {
    await deleteCloudinaryFile(teacher.profileImagePublicId);
  } catch {
    // Continue even if Cloudinary delete fails
  }

  teacher.profileImageUrl = undefined;
  teacher.profileImagePublicId = undefined;
  await teacher.save();

  await redisDel(`teachers:${branchId}`);

  await logAudit({
    schoolId,
    branchId,
    actorId,
    action: 'TEACHER_PASSPORT_REMOVED',
    entity: 'User',
    entityId: teacherId,
  });

  return { removed: true };
};

// ─────────────────────────────────────────────────────────────────────────────
// DEACTIVATE TEACHER
// ─────────────────────────────────────────────────────────────────────────────
export const deactivateTeacher = async (
  schoolId: string,
  branchId: string,
  teacherId: string,
  actorId: string,
  reason?: string
): Promise<{ deactivated: boolean }> => {
  const teacher = await User.findOne({
    _id: teacherId, schoolId, branchId, role: 'teacher',
  });
  if (!teacher) throw ApiError.notFound('Teacher not found');
  if (!teacher.isActive) throw ApiError.badRequest('Teacher is already deactivated');

  teacher.isActive = false;
  await teacher.save();

  // Unassign from all classes and subjects in this branch
  await Promise.all([
    Class.updateMany(
      { schoolId, branchId, formTeacherId: teacherId },
      { $unset: { formTeacherId: '' } }
    ),
    Subject.updateMany(
      { schoolId, branchId, teacherId },
      { $unset: { teacherId: '' } }
    ),
  ]);

  await redisDel(`teachers:${branchId}`);

  await logAudit({
    schoolId,
    branchId,
    actorId,
    action: 'TEACHER_DEACTIVATED',
    entity: 'User',
    entityId: teacherId,
    metadata: {
      reason: reason || 'No reason provided',
      name: `${teacher.firstName} ${teacher.lastName}`,
    },
  });

  return { deactivated: true };
};

// ─────────────────────────────────────────────────────────────────────────────
// REACTIVATE TEACHER
// ─────────────────────────────────────────────────────────────────────────────
export const reactivateTeacher = async (
  schoolId: string,
  branchId: string,
  teacherId: string,
  actorId: string
): Promise<{ reactivated: boolean }> => {
  const teacher = await User.findOne({
    _id: teacherId, schoolId, branchId, role: 'teacher',
  });
  if (!teacher) throw ApiError.notFound('Teacher not found');
  if (teacher.isActive) throw ApiError.badRequest('Teacher is already active');

  teacher.isActive = true;
  await teacher.save();

  await redisDel(`teachers:${branchId}`);

  await logAudit({
    schoolId,
    branchId,
    actorId,
    action: 'TEACHER_REACTIVATED',
    entity: 'User',
    entityId: teacherId,
    metadata: { name: `${teacher.firstName} ${teacher.lastName}` },
  });

  return { reactivated: true };
};

// ─────────────────────────────────────────────────────────────────────────────
// RESET TEACHER PASSWORD — Admin resets and emails new temp password
// ─────────────────────────────────────────────────────────────────────────────
export const resetTeacherPassword = async (
  schoolId: string,
  branchId: string,
  teacherId: string,
  actorId: string
): Promise<{ reset: boolean; message: string }> => {
  const teacher = await User.findOne({
    _id: teacherId, schoolId, branchId, role: 'teacher',
  });
  if (!teacher) throw ApiError.notFound('Teacher not found');
  if (!teacher.isActive) throw ApiError.badRequest('Cannot reset password for a deactivated teacher');

  // Generate a random temporary password
  const tempPassword =
    Math.random().toString(36).slice(2, 6).toUpperCase() +
    Math.random().toString(36).slice(2, 6) +
    '@1';

  const passwordHash = await bcrypt.hash(tempPassword, 12);

  teacher.passwordHash = passwordHash;
  teacher.passwordChangedAt = new Date();
  await teacher.save();

  // Email new password
  if (teacher.email) {
    try {
      const branch = await Branch.findById(branchId).select('name logoUrl').lean();

      const { subject, html } = teacherWelcomeTemplate({
        firstName: teacher.firstName,
        schoolName: branch?.name || 'Your School',
        branchName: branch?.name || '',
        email: teacher.email,
        password: tempPassword,
        staffId: teacher.staffId || '',
        loginUrl: `${env.FRONTEND_URL}/login`,
        logoUrl: branch?.logoUrl,
      });

      await sendEmail(teacher.email, `Password Reset — ${subject}`, html);
    } catch {
      // Email failure should not fail the reset
    }
  }

  await logAudit({
    schoolId,
    branchId,
    actorId,
    action: 'TEACHER_PASSWORD_RESET',
    entity: 'User',
    entityId: teacherId,
    metadata: { name: `${teacher.firstName} ${teacher.lastName}` },
  });

  return {
    reset: true,
    message: teacher.email
      ? 'Password reset. New temporary password sent to teacher email.'
      : 'Password reset. Teacher has no email on file — share credentials manually.',
  };
};