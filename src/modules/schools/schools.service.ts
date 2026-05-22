import { School } from '../../shared/models/School';
import { Branch } from '../../shared/models/Branch';
import { User } from '../../shared/models/User';
import { Subscription } from '../../shared/models/Subscription';
import { AuditLog } from '../../shared/models/AuditLog';
import { ApiError } from '../../shared/utils/ApiError';
import { logAudit } from '../../shared/utils/auditLogger';
import { deleteCloudinaryFile } from '../../config/cloudinary';
import { redisCacheOrFetch, redisDel } from '../../config/redis';
import dayjs from 'dayjs';
import { Staff } from '../../shared/models/Staff';
import { AttendanceSession } from '../../shared/models/AttendanceSession';

// ─────────────────────────────────────────────────────────────────────────────
// GET OWN SCHOOL
// ─────────────────────────────────────────────────────────────────────────────
export const getMySchool = async (schoolId: string) => {
  return redisCacheOrFetch(`school:${schoolId}`, 300, async () => {
    const school = await School.findById(schoolId).lean();
    if (!school) throw ApiError.notFound('School not found');

    const [branches, totalUsers, activeSubscription] = await Promise.all([
      Branch.find({ schoolId, isActive: true })
        .select('name address isMainBranch logoUrl principalName principalSignatureUrl isActive')
        .lean(),
      User.countDocuments({ schoolId, isActive: true, role: { $ne: 'superadmin' } }),
      Subscription.findOne({ schoolId, status: 'paid' })
        .sort({ expiresAt: -1 })
        .lean(),
    ]);

    return { school, branches, totalUsers, activeSubscription: activeSubscription || null };
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE SCHOOL
// ─────────────────────────────────────────────────────────────────────────────
export const updateSchool = async (
  schoolId: string,
  actorId: string,
  data: Partial<{
    name: string;
    phone: string;
    address: string;
    website: string;
  }>
) => {
  const school = await School.findByIdAndUpdate(
    schoolId,
    data,
    { new: true, runValidators: true }
  ).lean();
  if (!school) throw ApiError.notFound('School not found');

  await redisDel(`school:${schoolId}`);

  await logAudit({
    schoolId,
    actorId,
    action: 'SCHOOL_UPDATED',
    entity: 'School',
    entityId: schoolId,
    metadata: { updatedFields: Object.keys(data) },
  });

  return school;
};

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD SCHOOL LOGO
// ─────────────────────────────────────────────────────────────────────────────
export const uploadSchoolLogo = async (
  schoolId: string,
  actorId: string,
  fileUrl: string,
  publicId: string
) => {
  const school = await School.findById(schoolId);
  if (!school) throw ApiError.notFound('School not found');

  // Delete old logo from Cloudinary
  if (school.logoPublicId) {
    try {
      await deleteCloudinaryFile(school.logoPublicId);
    } catch {
      // non-blocking
    }
  }

  school.logoUrl = fileUrl;
  school.logoPublicId = publicId;
  await school.save();

  // Sync logo to main branch too
  await Branch.findOneAndUpdate(
    { schoolId, isMainBranch: true },
    { logoUrl: fileUrl, logoPublicId: publicId }
  );

  await redisDel(`school:${schoolId}`);

  await logAudit({
    schoolId,
    actorId,
    action: 'SCHOOL_LOGO_UPLOADED',
    entity: 'School',
    entityId: schoolId,
    metadata: { fileUrl },
  });

  return { logoUrl: fileUrl };
};

// ─────────────────────────────────────────────────────────────────────────────
// REMOVE SCHOOL LOGO
// ─────────────────────────────────────────────────────────────────────────────
export const removeSchoolLogo = async (schoolId: string, actorId: string) => {
  const school = await School.findById(schoolId);
  if (!school) throw ApiError.notFound('School not found');
  if (!school.logoPublicId) throw ApiError.badRequest('No logo to remove');

  try {
    await deleteCloudinaryFile(school.logoPublicId);
  } catch {
    // non-blocking
  }

  school.logoUrl = undefined;
  school.logoPublicId = undefined;
  await school.save();

  // Clear from main branch too
  await Branch.findOneAndUpdate(
    { schoolId, isMainBranch: true },
    { $unset: { logoUrl: '', logoPublicId: '' } }
  );

  await redisDel(`school:${schoolId}`);

  await logAudit({
    schoolId,
    actorId,
    action: 'SCHOOL_LOGO_REMOVED',
    entity: 'School',
    entityId: schoolId,
  });

  return { removed: true };
};

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD PRINCIPAL SIGNATURE
// Stored on the branch so it appears on result cards, ID cards and PDFs.
// If branchId is not provided it defaults to the main branch.
// ─────────────────────────────────────────────────────────────────────────────
export const uploadPrincipalSignature = async (
  schoolId: string,
  actorId: string,
  fileUrl: string,
  publicId: string,
  branchId?: string
) => {
  // Resolve which branch to update
  const branchQuery = branchId
    ? { _id: branchId, schoolId }
    : { schoolId, isMainBranch: true };

  const branch = await Branch.findOne(branchQuery);
  if (!branch) throw ApiError.notFound('Branch not found');

  // Delete old signature from Cloudinary
  if (branch.principalSignaturePublicId) {
    try {
      await deleteCloudinaryFile(branch.principalSignaturePublicId);
    } catch {
      // non-blocking
    }
  }

  branch.principalSignatureUrl = fileUrl;
  branch.principalSignaturePublicId = publicId;
  await branch.save();

  // Invalidate caches
  await Promise.all([
    redisDel(`school:${schoolId}`),
    redisDel(`branch:${(branch._id as any).toString()}`),
    redisDel(`branches:${schoolId}`),
  ]);

  await logAudit({
    schoolId,
    branchId: (branch._id as any).toString(),
    actorId,
    action: 'PRINCIPAL_SIGNATURE_UPLOADED',
    entity: 'Branch',
    entityId: (branch._id as any).toString(),
    metadata: {
      fileUrl,
      branchName: branch.name,
      isMainBranch: branch.isMainBranch,
    },
  });

  return {
    principalSignatureUrl: fileUrl,
    branchId: (branch._id as any).toString(),
    branchName: branch.name,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// REMOVE PRINCIPAL SIGNATURE
// ─────────────────────────────────────────────────────────────────────────────
export const removePrincipalSignature = async (
  schoolId: string,
  actorId: string,
  branchId?: string
) => {
  const branchQuery = branchId
    ? { _id: branchId, schoolId }
    : { schoolId, isMainBranch: true };

  const branch = await Branch.findOne(branchQuery);
  if (!branch) throw ApiError.notFound('Branch not found');

  if (!branch.principalSignaturePublicId) {
    throw ApiError.badRequest('This branch has no principal signature to remove');
  }

  try {
    await deleteCloudinaryFile(branch.principalSignaturePublicId);
  } catch {
    // non-blocking
  }

  branch.principalSignatureUrl = undefined;
  branch.principalSignaturePublicId = undefined;
  await branch.save();

  await Promise.all([
    redisDel(`school:${schoolId}`),
    redisDel(`branch:${(branch._id as any).toString()}`),
    redisDel(`branches:${schoolId}`),
  ]);

  await logAudit({
    schoolId,
    branchId: (branch._id as any).toString(),
    actorId,
    action: 'PRINCIPAL_SIGNATURE_REMOVED',
    entity: 'Branch',
    entityId: (branch._id as any).toString(),
    metadata: { branchName: branch.name },
  });

  return { removed: true };
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE PRINCIPAL NAME
// Updates name only — no file upload needed
// ─────────────────────────────────────────────────────────────────────────────
export const updatePrincipalName = async (
  schoolId: string,
  actorId: string,
  principalName: string,
  branchId?: string
) => {
  const branchQuery = branchId
    ? { _id: branchId, schoolId }
    : { schoolId, isMainBranch: true };

  const branch = await Branch.findOneAndUpdate(
    branchQuery,
    { principalName: principalName.trim() },
    { new: true }
  ).select('name principalName principalSignatureUrl isMainBranch');

  if (!branch) throw ApiError.notFound('Branch not found');

  await Promise.all([
    redisDel(`school:${schoolId}`),
    redisDel(`branch:${(branch._id as any).toString()}`),
    redisDel(`branches:${schoolId}`),
  ]);

  await logAudit({
    schoolId,
    branchId: (branch._id as any).toString(),
    actorId,
    action: 'PRINCIPAL_NAME_UPDATED',
    entity: 'Branch',
    entityId: (branch._id as any).toString(),
    metadata: { principalName, branchName: branch.name },
  });

  return {
    principalName: branch.principalName,
    branchId: (branch._id as any).toString(),
    branchName: branch.name,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET SCHOOL STATS
// ─────────────────────────────────────────────────────────────────────────────
export const getSchoolStats = async (schoolId: string) => {
  return redisCacheOrFetch(`school:stats:${schoolId}`, 120, async () => {
    const [
      totalBranches,
      totalStudents,
      totalTeachers,
      totalParents,
      totalAdmins,
      subscriptionHistory,
    ] = await Promise.all([
      Branch.countDocuments({ schoolId, isActive: true }),
      User.countDocuments({ schoolId, role: 'student', isActive: true }),
      User.countDocuments({ schoolId, role: 'teacher', isActive: true }),
      User.countDocuments({ schoolId, role: 'parent', isActive: true }),
      User.countDocuments({ schoolId, role: 'schooladmin', isActive: true }),
      Subscription.find({ schoolId }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const totalRevenuePaid = subscriptionHistory
      .filter((s) => s.status === 'paid')
      .reduce((sum, s) => sum + s.amountNaira, 0);

    return {
      branches: totalBranches,
      users: {
        students: totalStudents,
        teachers: totalTeachers,
        parents: totalParents,
        admins: totalAdmins,
        total: totalStudents + totalTeachers + totalParents + totalAdmins,
      },
      subscriptionHistory,
      totalRevenuePaidNaira: totalRevenuePaid,
    };
  });
};

export const getBranchOverview = async (schoolId: string, branchId: string) => {
  const today = dayjs().format('YYYY-MM-DD');

  const branch = await Branch.findOne({ _id: branchId, schoolId }).lean();
  if (!branch) throw ApiError.notFound('Branch not found or does not belong to this school');

  const [
    totalStudents, totalTeachers, totalStaff,
    todaySession, recentAuditLogs,
  ] = await Promise.all([
    User.countDocuments({ schoolId, branchId, role: 'student', isActive: true }),
    User.countDocuments({ schoolId, branchId, role: 'teacher', isActive: true }),
    Staff.countDocuments({ schoolId, branchId, isActive: true }),
    AttendanceSession.findOne({ schoolId, branchId, date: today }).lean(),
    AuditLog.find({ schoolId, branchId }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  return {
    branch,
    users: { totalStudents, totalTeachers, totalStaff },
    todayAttendance: todaySession
      ? {
          present: todaySession.totalPresent,
          absent: todaySession.totalAbsent,
          late: todaySession.totalLate,
          signedOut: todaySession.totalSignedOut,
          total: todaySession.entries.length,
        }
      : null,
    recentAuditLogs,
  };
};

export const getAllBranchesOverview = async (schoolId: string) => {
  const branches = await Branch.find({ schoolId, isActive: true }).lean();
  const overviews = await Promise.all(
    branches.map((b) => getBranchOverview(schoolId, (b._id as any).toString()))
  );
  return overviews;
};


// ─────────────────────────────────────────────────────────────────────────────
// GET SCHOOL AUDIT LOGS
// ─────────────────────────────────────────────────────────────────────────────
export const getSchoolAuditLogs = async (
  schoolId: string,
  page = 1,
  limit = 30,
  action?: string
) => {
  const { getPagination, paginatedResponse } = await import('../../shared/utils/pagination');
  const { skip } = getPagination(page, limit);

  const query: Record<string, unknown> = { schoolId };
  if (action) query.action = { $regex: action, $options: 'i' };

  const [data, total] = await Promise.all([
    AuditLog.find(query)
      .populate('actorId', 'firstName lastName role')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(query),
  ]);

  return paginatedResponse(data, total, page, limit);
};

