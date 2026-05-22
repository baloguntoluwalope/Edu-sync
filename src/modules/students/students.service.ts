import QRCode from 'qrcode';
import { User } from '../../shared/models/User';
import { Class } from '../../shared/models/Class';
import { ApiError } from '../../shared/utils/ApiError';
import { getPagination, paginatedResponse } from '../../shared/utils/pagination';
import { generateAdmissionNumber } from '../../shared/utils/generateAdmissionNumber';
import { logAudit } from '../../shared/utils/auditLogger';
import { deleteCloudinaryFile } from '../../config/cloudinary';
import dayjs from 'dayjs';

  import { generateQRCode } from '../../shared/utils/qrCodeGenerator';



// ─────────────────────────────────────────────────────────────────────────────
// CREATE STUDENT
// ─────────────────────────────────────────────────────────────────────────────
export const createStudent = async (
  schoolId: string,
  branchId: string,
  actorId: string,
  data: {
    // Compulsory
    firstName: string;
    lastName: string;
    middleName?: string;
    gender: 'male' | 'female';
    dateOfBirth: string;
    classId: string;
    admissionDate?: string;
    homeAddress: string;
    city: string;
    state: string;
    nationality?: string;
    stateOfOrigin?: string;
    lgaOfOrigin?: string;
    religion?: string;

    // Medical
    bloodGroup?: string;
    genotype?: string;
    medicalConditions?: string;
    allergies?: string;

    // Emergency contact
    emergencyContactName: string;
    emergencyContactPhone: string;
    emergencyContactRelationship: string;

    // Parent
    parentFirstName: string;
    parentLastName: string;
    parentPhone: string;
    parentEmail?: string;
    parentGender?: string;
    parentRelationship?: string;
    parentOccupation?: string;
    parentAddress?: string;

    // Previous school
    previousSchoolName?: string;
    previousSchoolAddress?: string;
    previousClass?: string;
    reasonForLeaving?: string;
  }
) => {
  // Validate class belongs to this branch
  const cls = await Class.findOne({ _id: data.classId, schoolId, branchId });
  if (!cls) throw ApiError.notFound('Class not found in this branch');

  const admissionNumber = await generateAdmissionNumber(schoolId, 'STU', 3);
  const admissionDate = data.admissionDate
    ? new Date(data.admissionDate)
    : new Date();

  // Create student
  const student = await User.create({
    schoolId,
    branchId,
    role: 'student',
    firstName: data.firstName,
    lastName: data.lastName,
    middleName: data.middleName,
    gender: data.gender,
    dateOfBirth: new Date(data.dateOfBirth),
    admissionNumber,
    admissionDate,
    classId: data.classId,
    homeAddress: data.homeAddress,
    city: data.city,
    state: data.state,
    nationality: data.nationality || 'Nigerian',
    stateOfOrigin: data.stateOfOrigin,
    lgaOfOrigin: data.lgaOfOrigin,
    religion: data.religion,
    bloodGroup: data.bloodGroup,
    genotype: data.genotype,
    medicalConditions: data.medicalConditions,
    allergies: data.allergies,
    emergencyContactName: data.emergencyContactName,
    emergencyContactPhone: data.emergencyContactPhone,
    emergencyContactRelationship: data.emergencyContactRelationship,
    previousSchoolName: data.previousSchoolName,
    previousSchoolAddress: data.previousSchoolAddress,
    previousClass: data.previousClass,
    reasonForLeaving: data.reasonForLeaving,
    isActive: true,
    isEmailVerified: false,
  });

// Replace the old QRCode.toDataURL call with this
const studentQR = await generateQRCode({
  type: 'student',
  id: (student._id as any).toString(),
  schoolId,
  branchId,
  identifier: admissionNumber,
  name: `${data.firstName} ${data.lastName}`,
});

await User.findByIdAndUpdate(student._id, {
  qrCodeData: studentQR.qrCodeData,
  qrCodeUrl: studentQR.qrCodeUrl,
});

  // Add student to class
  await Class.findByIdAndUpdate(data.classId, {
    $addToSet: { studentIds: student._id },
  });

  // Create or update parent account
  const parent = await User.findOneAndUpdate(
    { schoolId, branchId, phone: data.parentPhone, role: 'parent' },
    {
      $setOnInsert: {
        schoolId,
        branchId,
        role: 'parent',
        firstName: data.parentFirstName,
        lastName: data.parentLastName,
        phone: data.parentPhone,
        email: data.parentEmail,
        gender: data.parentGender,
        homeAddress: data.parentAddress,
        isActive: true,
        isEmailVerified: false,
        notificationPrefs: { email: true, inApp: true, sms: false },
      },
      $addToSet: { linkedStudents: student._id },
    },
    { upsert: true, new: true }
  );

  // Generate QR code for attendance
  const qrPayload = JSON.stringify({
    s: schoolId,
    b: branchId,
    st: (student._id as any).toString(),
    an: admissionNumber,
  });
  const qrCode = await QRCode.toDataURL(qrPayload);

  await logAudit({
    schoolId,
    branchId,
    actorId,
    action: 'STUDENT_CREATED',
    entity: 'User',
    entityId: (student._id as any).toString(),
    metadata: { admissionNumber, class: cls.name },
  });

  return {
    student: sanitizeStudent(student.toObject()),
    admissionNumber,
    qrCode,
    parent: {
      id: parent._id,
      firstName: parent.firstName,
      lastName: parent.lastName,
      phone: parent.phone,
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE STUDENT PROFILE
// ─────────────────────────────────────────────────────────────────────────────
export const updateStudent = async (
  schoolId: string,
  branchId: string,
  studentId: string,
  actorId: string,
  data: Record<string, unknown>
) => {
  // If classId is changing, update class rosters
  if (data.classId) {
    const newClass = await Class.findOne({
      _id: data.classId, schoolId, branchId,
    });
    if (!newClass) throw ApiError.notFound('New class not found in this branch');

    // Remove from old class
    await Class.updateMany(
      { schoolId, branchId, studentIds: studentId },
      { $pull: { studentIds: studentId } }
    );

    // Add to new class
    await Class.findByIdAndUpdate(data.classId, {
      $addToSet: { studentIds: studentId },
    });
  }

  const student = await User.findOneAndUpdate(
    { _id: studentId, schoolId, branchId, role: 'student' },
    data,
    { new: true, runValidators: true }
  );

  if (!student) throw ApiError.notFound('Student not found');

  await logAudit({
    schoolId, branchId, actorId,
    action: 'STUDENT_UPDATED', entity: 'User', entityId: studentId,
    metadata: { updatedFields: Object.keys(data) },
  });

  return sanitizeStudent(student.toObject());
};

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD STUDENT PASSPORT
// ─────────────────────────────────────────────────────────────────────────────
export const uploadPassport = async (
  schoolId: string,
  branchId: string,
  studentId: string,
  actorId: string,
  fileUrl: string,
  publicId: string
) => {
  const student = await User.findOne({
    _id: studentId, schoolId, branchId, role: 'student',
  });
  if (!student) throw ApiError.notFound('Student not found');

  // Delete old passport from Cloudinary
  if (student.passportPublicId) {
    await deleteCloudinaryFile(student.passportPublicId);
  }

  student.passportUrl = fileUrl;
  student.passportPublicId = publicId;
  await student.save();

  await logAudit({
    schoolId, branchId, actorId,
    action: 'STUDENT_PASSPORT_UPLOADED', entity: 'User', entityId: studentId,
    metadata: { fileUrl },
  });

  return { passportUrl: fileUrl };
};

// ─────────────────────────────────────────────────────────────────────────────
// REMOVE STUDENT PASSPORT
// ─────────────────────────────────────────────────────────────────────────────
export const removePassport = async (
  schoolId: string,
  branchId: string,
  studentId: string,
  actorId: string
) => {
  const student = await User.findOne({
    _id: studentId, schoolId, branchId, role: 'student',
  });
  if (!student) throw ApiError.notFound('Student not found');
  if (!student.passportPublicId) throw ApiError.badRequest('No passport to remove');

  await deleteCloudinaryFile(student.passportPublicId);

  student.passportUrl = undefined;
  student.passportPublicId = undefined;
  await student.save();

  return { removed: true };
};

// ─────────────────────────────────────────────────────────────────────────────
// LIST STUDENTS
// ─────────────────────────────────────────────────────────────────────────────
export const listStudents = async (
  schoolId: string,
  branchId: string,
  page = 1,
  limit = 20,
  classId?: string,
  search?: string,
  gender?: string
) => {
  const { skip } = getPagination(page, limit);

  const query: Record<string, unknown> = {
    schoolId, branchId, role: 'student',
  };

  if (classId) {
    const cls = await Class.findById(classId).select('studentIds');
    query._id = { $in: cls?.studentIds || [] };
  }

  if (gender) query.gender = gender;

  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { middleName: { $regex: search, $options: 'i' } },
      { admissionNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const [data, total] = await Promise.all([
    User.find(query)
      .select('-passwordHash -passportPublicId -profileImagePublicId')
      .populate('classId', 'name category')
      .sort({ lastName: 1, firstName: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  return paginatedResponse(data, total, page, limit);
};

// ─────────────────────────────────────────────────────────────────────────────
// GET SINGLE STUDENT — Full profile
// ─────────────────────────────────────────────────────────────────────────────
export const getStudent = async (
  schoolId: string,
  branchId: string,
  studentId: string
) => {
  const student = await User.findOne({
    _id: studentId, schoolId, branchId, role: 'student',
  })
    .select('-passwordHash -passportPublicId')
    .populate('classId', 'name category formTeacherId')
    .lean();

  if (!student) throw ApiError.notFound('Student not found');

  // Fetch linked parents
  const parents = await User.find({
    linkedStudents: studentId, role: 'parent',
  })
    .select('firstName lastName phone email gender homeAddress notificationPrefs')
    .lean();

  // Calculate age
  const age = student.dateOfBirth
    ? dayjs().diff(dayjs(student.dateOfBirth), 'year')
    : null;

  return { student: { ...student, age }, parents };
};

// ─────────────────────────────────────────────────────────────────────────────
// REGENERATE QR CODE
// ─────────────────────────────────────────────────────────────────────────────
export const regenerateQRCode = async (
  schoolId: string,
  branchId: string,
  studentId: string
) => {
  const student = await User.findOne({
    _id: studentId, schoolId, branchId, role: 'student',
  }).select('admissionNumber');
  if (!student) throw ApiError.notFound('Student not found');

  const qrPayload = JSON.stringify({
    s: schoolId,
    b: branchId,
    st: studentId,
    an: student.admissionNumber,
  });
  const qrCode = await QRCode.toDataURL(qrPayload);
  return { qrCode, admissionNumber: student.admissionNumber };
};

// ─────────────────────────────────────────────────────────────────────────────
// DEACTIVATE STUDENT
// ─────────────────────────────────────────────────────────────────────────────
export const deactivateStudent = async (
  schoolId: string,
  branchId: string,
  studentId: string,
  actorId: string,
  reason?: string
) => {
  const student = await User.findOneAndUpdate(
    { _id: studentId, schoolId, branchId, role: 'student' },
    { isActive: false },
    { new: true }
  );
  if (!student) throw ApiError.notFound('Student not found');

  // Remove from class
  await Class.updateMany(
    { schoolId, branchId, studentIds: studentId },
    { $pull: { studentIds: studentId } }
  );

  await logAudit({
    schoolId, branchId, actorId,
    action: 'STUDENT_DEACTIVATED', entity: 'User', entityId: studentId,
    metadata: { reason },
  });

  return { deactivated: true };
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — Strip internal fields from student object
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// HELPER — Strip internal fields from student object
// ─────────────────────────────────────────────────────────────────────────────
const sanitizeStudent = (student: any) => {
  const { 
    passwordHash, 
    passportPublicId, 
    profileImagePublicId, 
    verificationToken, 
    verificationExpires, 
    ...safe 
  } = student;
  return safe;
};