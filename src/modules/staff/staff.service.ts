import dayjs from 'dayjs';
import { Staff } from '../../shared/models/Staff';
import { Branch } from '../../shared/models/Branch';
import { ApiError } from '../../shared/utils/ApiError';
import { getPagination, paginatedResponse } from '../../shared/utils/pagination';
import { logAudit } from '../../shared/utils/auditLogger';
import { generateQRCode } from '../../shared/utils/qrCodeGenerator';
import { deleteCloudinaryFile } from '../../config/cloudinary';
import { uploadToCloudinary } from '../uploads/upload.middleware';

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE STAFF ID
// ─────────────────────────────────────────────────────────────────────────────
const generateStaffId = (role: string): string => {
  const prefix = {
    non_teaching: 'NTS',
    bursar: 'BUR',
    librarian: 'LIB',
    security: 'SEC',
    cleaner: 'CLN',
    driver: 'DRV',
    cook: 'COK',
    nurse: 'NRS',
    counselor: 'CNS',
    it_support: 'ITS',
    other: 'STF',
  }[role] || 'STF';

  const year = dayjs().format('YY');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${year}-${rand}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE STAFF
// ─────────────────────────────────────────────────────────────────────────────
export const createStaff = async (
  schoolId: string,
  branchId: string,
  actorId: string,
  data: {
    firstName: string;
    lastName: string;
    middleName?: string;
    gender: 'male' | 'female';
    dateOfBirth?: string;
    religion?: string;
    nationality?: string;
    stateOfOrigin?: string;
    lgaOfOrigin?: string;
    email?: string;
    phone: string;
    homeAddress: string;
    city: string;
    state: string;
    staffRole: string;
    customRole?: string;
    department?: string;
    qualification?: string;
    dateEmployed?: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    emergencyContactRelationship: string;
  }
) => {
  // Check phone unique in school
  const phoneExists = await Staff.findOne({ schoolId, phone: data.phone });
  if (phoneExists) throw ApiError.conflict('A staff member with this phone already exists');

  if (data.email) {
    const emailExists = await Staff.findOne({ schoolId, email: data.email.toLowerCase() });
    if (emailExists) throw ApiError.conflict('A staff member with this email already exists');
  }

  const staffId = generateStaffId(data.staffRole);
  const fullName = `${data.firstName} ${data.lastName}`;

  // Generate QR code
  const { qrCodeData, qrCodeUrl } = await generateQRCode({
    type: 'staff',
    id: 'pending',
    schoolId,
    branchId,
    identifier: staffId,
    name: fullName,
  });

  const staff = await Staff.create({
    schoolId,
    branchId,
    ...data,
    email: data.email?.toLowerCase().trim(),
    staffId,
    qrCodeData,
    qrCodeUrl,
    dateEmployed: data.dateEmployed ? new Date(data.dateEmployed) : new Date(),
    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
    nationality: data.nationality || 'Nigerian',
    isActive: true,
  });

  // Regenerate QR with actual ID
  const { qrCodeData: finalQr, qrCodeUrl: finalQrUrl } = await generateQRCode({
    type: 'staff',
    id: (staff._id as any).toString(),
    schoolId,
    branchId,
    identifier: staffId,
    name: fullName,
  });

  staff.qrCodeData = finalQr;
  staff.qrCodeUrl = finalQrUrl;
  await staff.save();

  await logAudit({
    schoolId,
    branchId,
    actorId,
    action: 'STAFF_CREATED',
    entity: 'Staff',
    entityId: (staff._id as any).toString(),
    metadata: { staffId, staffRole: data.staffRole, name: fullName },
  });

  return { staff, qrCode: finalQrUrl };
};

// ─────────────────────────────────────────────────────────────────────────────
// LIST STAFF
// ─────────────────────────────────────────────────────────────────────────────
export const listStaff = async (
  schoolId: string,
  branchId: string,
  page = 1,
  limit = 20,
  staffRole?: string,
  search?: string,
  isActive?: boolean
) => {
  const { skip } = getPagination(page, limit);
  const query: Record<string, unknown> = { schoolId, branchId };

  if (staffRole) query.staffRole = staffRole;
  if (typeof isActive === 'boolean') query.isActive = isActive;
  if (search?.trim()) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { staffId: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { staffRole: { $regex: search, $options: 'i' } },
      { department: { $regex: search, $options: 'i' } },
    ];
  }

  const [data, total] = await Promise.all([
    Staff.find(query)
      .select('-passportPublicId')
      .sort({ lastName: 1, firstName: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Staff.countDocuments(query),
  ]);

  return paginatedResponse(data, total, page, limit);
};

// ─────────────────────────────────────────────────────────────────────────────
// GET SINGLE STAFF
// ─────────────────────────────────────────────────────────────────────────────
export const getStaff = async (
  schoolId: string,
  branchId: string,
  staffId: string
) => {
  const staff = await Staff.findOne({ _id: staffId, schoolId, branchId })
    .select('-passportPublicId')
    .lean();
  if (!staff) throw ApiError.notFound('Staff member not found');

  const age = staff.dateOfBirth
    ? dayjs().diff(dayjs(staff.dateOfBirth), 'year')
    : null;

  return { ...staff, age };
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE STAFF
// ─────────────────────────────────────────────────────────────────────────────
export const updateStaff = async (
  schoolId: string,
  branchId: string,
  staffId: string,
  actorId: string,
  data: Record<string, unknown>
) => {
  const existing = await Staff.findOne({ _id: staffId, schoolId, branchId });
  if (!existing) throw ApiError.notFound('Staff member not found');

  if (data.phone && data.phone !== existing.phone) {
    const phoneExists = await Staff.findOne({
      schoolId, phone: data.phone, _id: { $ne: staffId },
    });
    if (phoneExists) throw ApiError.conflict('Phone number already in use');
  }

  if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth as string);
  if (data.dateEmployed) data.dateEmployed = new Date(data.dateEmployed as string);

  const updated = await Staff.findByIdAndUpdate(
    staffId,
    { $set: data },
    { new: true, runValidators: true }
  ).select('-passportPublicId');

  if (!updated) throw ApiError.notFound('Staff member not found');

  await logAudit({
    schoolId, branchId, actorId,
    action: 'STAFF_UPDATED', entity: 'Staff', entityId: staffId,
    metadata: { updatedFields: Object.keys(data) },
  });

  return updated;
};

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD STAFF PASSPORT
// ─────────────────────────────────────────────────────────────────────────────
export const uploadStaffPassport = async (
  schoolId: string,
  branchId: string,
  staffId: string,
  actorId: string,
  fileUrl: string,
  publicId: string
) => {
  const staff = await Staff.findOne({ _id: staffId, schoolId, branchId });
  if (!staff) throw ApiError.notFound('Staff member not found');

  if (staff.passportPublicId) {
    try { await deleteCloudinaryFile(staff.passportPublicId); } catch { }
  }

  staff.passportUrl = fileUrl;
  staff.passportPublicId = publicId;
  await staff.save();

  await logAudit({
    schoolId, branchId, actorId,
    action: 'STAFF_PASSPORT_UPLOADED', entity: 'Staff', entityId: staffId,
  });

  return { passportUrl: fileUrl };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET QR CODE
// ─────────────────────────────────────────────────────────────────────────────
export const getStaffQRCode = async (
  schoolId: string,
  branchId: string,
  staffId: string
) => {
  const staff = await Staff.findOne({ _id: staffId, schoolId, branchId })
    .select('firstName lastName staffId qrCodeUrl qrCodeData')
    .lean();
  if (!staff) throw ApiError.notFound('Staff member not found');

  return {
    qrCodeUrl: staff.qrCodeUrl,
    qrCodeData: staff.qrCodeData,
    staffId: staff.staffId,
    name: `${staff.firstName} ${staff.lastName}`,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// REGENERATE QR CODE
// ─────────────────────────────────────────────────────────────────────────────
export const regenerateStaffQR = async (
  schoolId: string,
  branchId: string,
  staffId: string
) => {
  const staff = await Staff.findOne({ _id: staffId, schoolId, branchId });
  if (!staff) throw ApiError.notFound('Staff member not found');

  const { qrCodeData, qrCodeUrl } = await generateQRCode({
    type: 'staff',
    id: (staff._id as any).toString(),
    schoolId,
    branchId,
    identifier: staff.staffId,
    name: `${staff.firstName} ${staff.lastName}`,
  });

  staff.qrCodeData = qrCodeData;
  staff.qrCodeUrl = qrCodeUrl;
  await staff.save();

  return { qrCodeUrl, staffId: staff.staffId };
};

// ─────────────────────────────────────────────────────────────────────────────
// DEACTIVATE STAFF
// ─────────────────────────────────────────────────────────────────────────────
export const deactivateStaff = async (
  schoolId: string,
  branchId: string,
  staffId: string,
  actorId: string,
  reason?: string
) => {
  const staff = await Staff.findOne({ _id: staffId, schoolId, branchId });
  if (!staff) throw ApiError.notFound('Staff member not found');
  if (!staff.isActive) throw ApiError.badRequest('Staff is already deactivated');

  staff.isActive = false;
  await staff.save();

  await logAudit({
    schoolId, branchId, actorId,
    action: 'STAFF_DEACTIVATED', entity: 'Staff', entityId: staffId,
    metadata: { reason: reason || 'No reason provided' },
  });

  return { deactivated: true };
};

// ─────────────────────────────────────────────────────────────────────────────
// REACTIVATE STAFF
// ─────────────────────────────────────────────────────────────────────────────
export const reactivateStaff = async (
  schoolId: string,
  branchId: string,
  staffId: string,
  actorId: string
) => {
  const staff = await Staff.findOne({ _id: staffId, schoolId, branchId });
  if (!staff) throw ApiError.notFound('Staff member not found');
  if (staff.isActive) throw ApiError.badRequest('Staff is already active');

  staff.isActive = true;
  await staff.save();

  await logAudit({
    schoolId, branchId, actorId,
    action: 'STAFF_REACTIVATED', entity: 'Staff', entityId: staffId,
  });

  return { reactivated: true };
};