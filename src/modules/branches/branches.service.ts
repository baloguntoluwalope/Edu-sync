import { Branch } from '../../shared/models/Branch';
import { Class } from '../../shared/models/Class';
import { Subject } from '../../shared/models/Subject';
import { School } from '../../shared/models/School';
import { User } from '../../shared/models/User';
import { ApiError } from '../../shared/utils/ApiError';
import { logAudit } from '../../shared/utils/auditLogger';
import { sendEmail, branchWelcomeTemplate } from '../../shared/utils/emailTemplates';
import { env } from '../../config/env';
import { deleteCloudinaryFile } from '../../config/cloudinary';
import { redisCacheOrFetch, redisDel } from '../../config/redis';

const DEFAULT_CLASSES = [
  { name: 'KG1', category: 'KG' }, { name: 'KG2', category: 'KG' },
  { name: 'Nursery 1', category: 'Nursery' }, { name: 'Nursery 2', category: 'Nursery' },
  { name: 'Primary 1', category: 'Primary' }, { name: 'Primary 2', category: 'Primary' },
  { name: 'Primary 3', category: 'Primary' }, { name: 'Primary 4', category: 'Primary' },
  { name: 'Primary 5', category: 'Primary' }, { name: 'Primary 6', category: 'Primary' },
  { name: 'JSS1', category: 'JSS' }, { name: 'JSS2', category: 'JSS' }, { name: 'JSS3', category: 'JSS' },
  { name: 'SS1', category: 'SSS' }, { name: 'SS2', category: 'SSS' }, { name: 'SS3', category: 'SSS' },
] as const;

const DEFAULT_SUBJECTS = [
  'English Language', 'Mathematics', 'Basic Science',
  'Social Studies', 'Civic Education', 'Agricultural Science',
];

export const createBranch = async (
  schoolId: string,
  actorId: string,
  data: {
    name: string;
    address: string;
    phone?: string;
    email?: string;
    principalName?: string;
    whatsappGroupLink?: string;
  }
) => {
  const school = await School.findById(schoolId).select('name email logoUrl');
  if (!school) throw ApiError.notFound('School not found');

  const exists = await Branch.findOne({ schoolId, name: data.name });
  if (exists) throw ApiError.conflict('A branch with this name already exists');

  const branch = await Branch.create({ schoolId, ...data, isMainBranch: false });

  // Auto-seed classes & subjects for new branch
  const classIds = await Class.insertMany(
    DEFAULT_CLASSES.map((c) => ({
      schoolId, branchId: branch._id, name: c.name, category: c.category,
    }))
  );

  await Subject.insertMany(
    classIds.flatMap((cls) =>
      DEFAULT_SUBJECTS.map((name) => ({
        schoolId, branchId: branch._id, classId: cls._id, name, isDefault: true,
      }))
    )
  );

  // Invalidate cache
  await redisDel(`branches:${schoolId}`);

  // Send branch welcome email to school admin
  const admin = await User.findOne({ schoolId, role: 'schooladmin' }).select('email firstName lastName');
  if (admin?.email) {
    const { subject, html } = branchWelcomeTemplate({
      adminName: `${admin.firstName} ${admin.lastName}`,
      schoolName: school.name,
      branchName: data.name,
      branchAddress: data.address,
      loginUrl: `${env.FRONTEND_URL}/login`,
      logoUrl: school.logoUrl,
    });
    await sendEmail(admin.email, subject, html);
  }

  await logAudit({
    schoolId,
    branchId: (branch._id as any).toString(),
    actorId,
    action: 'BRANCH_CREATED',
    entity: 'Branch',
    entityId: (branch._id as any).toString(),
    metadata: { name: data.name },
  });

  return branch;
};

export const listBranches = async (schoolId: string) => {
  return redisCacheOrFetch(`branches:${schoolId}`, 300, () =>
    Branch.find({ schoolId, isActive: true }).lean()
  );
};

export const getBranch = async (schoolId: string, branchId: string) => {
  return redisCacheOrFetch(`branch:${branchId}`, 300, async () => {
    const branch = await Branch.findOne({ _id: branchId, schoolId }).lean();
    if (!branch) throw ApiError.notFound('Branch not found');
    return branch;
  });
};

export const updateBranch = async (
  schoolId: string,
  branchId: string,
  actorId: string,
  data: Partial<{
    name: string; address: string; phone: string; email: string;
    principalName: string; whatsappGroupLink: string;
  }>
) => {
  const branch = await Branch.findOneAndUpdate(
    { _id: branchId, schoolId },
    data,
    { new: true, runValidators: true }
  );
  if (!branch) throw ApiError.notFound('Branch not found');

  await redisDel(`branch:${branchId}`);
  await redisDel(`branches:${schoolId}`);

  await logAudit({
    schoolId, branchId, actorId,
    action: 'BRANCH_UPDATED', entity: 'Branch', entityId: branchId,
  });

  return branch;
};

export const uploadBranchLogo = async (
  schoolId: string,
  branchId: string,
  fileUrl: string,
  publicId: string
) => {
  const branch = await Branch.findOne({ _id: branchId, schoolId });
  if (!branch) throw ApiError.notFound('Branch not found');

  // Delete old logo from Cloudinary
  if (branch.logoPublicId) await deleteCloudinaryFile(branch.logoPublicId);

  branch.logoUrl = fileUrl;
  branch.logoPublicId = publicId;
  await branch.save();

  await redisDel(`branch:${branchId}`);
  return branch;
};

export const uploadPrincipalSignature = async (
  schoolId: string,
  branchId: string,
  fileUrl: string,
  publicId: string
) => {
  const branch = await Branch.findOne({ _id: branchId, schoolId });
  if (!branch) throw ApiError.notFound('Branch not found');

  if (branch.principalSignaturePublicId)
    await deleteCloudinaryFile(branch.principalSignaturePublicId);

  branch.principalSignatureUrl = fileUrl;
  branch.principalSignaturePublicId = publicId;
  await branch.save();

  await redisDel(`branch:${branchId}`);
  return branch;
};

export const deactivateBranch = async (schoolId: string, branchId: string, actorId: string) => {
  const branch = await Branch.findOne({ _id: branchId, schoolId });
  if (!branch) throw ApiError.notFound('Branch not found');
  if (branch.isMainBranch) throw ApiError.badRequest('Cannot deactivate the main branch');

  branch.isActive = false;
  await branch.save();
  await redisDel(`branches:${schoolId}`);
  await redisDel(`branch:${branchId}`);

  await logAudit({ schoolId, branchId, actorId, action: 'BRANCH_DEACTIVATED', entity: 'Branch', entityId: branchId });

  return branch;
};