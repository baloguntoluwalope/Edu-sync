import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import slugify from 'slugify';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../shared/models/User';
import { School } from '../../shared/models/School';
import { Branch } from '../../shared/models/Branch';
import { Class } from '../../shared/models/Class';
import { Subject } from '../../shared/models/Subject';
import { OTP } from '../../shared/models/OTP';
import { signToken } from '../../shared/utils/jwt';
import { ApiError } from '../../shared/utils/ApiError';
import { logAudit } from '../../shared/utils/auditLogger';
import { sendEmail } from '../../config/mailer';
import {
  schoolWelcomeTemplate,
  otpVerificationTemplate,
  emailVerifiedTemplate,
} from '../../shared/utils/emailTemplates';
import { redisSet, redisGet, redisDel } from '../../config/redis';
import { env } from '../../config/env';
 import { generateQRCode } from '../../shared/utils/qrCodeGenerator';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const OTP_EXPIRY_MINUTES = 10;

const DEFAULT_CLASSES = [
  { name: 'KG1', category: 'KG' },
  { name: 'KG2', category: 'KG' },
  { name: 'Nursery 1', category: 'Nursery' },
  { name: 'Nursery 2', category: 'Nursery' },
  { name: 'Primary 1', category: 'Primary' },
  { name: 'Primary 2', category: 'Primary' },
  { name: 'Primary 3', category: 'Primary' },
  { name: 'Primary 4', category: 'Primary' },
  { name: 'Primary 5', category: 'Primary' },
  { name: 'Primary 6', category: 'Primary' },
  { name: 'JSS1', category: 'JSS' },
  { name: 'JSS2', category: 'JSS' },
  { name: 'JSS3', category: 'JSS' },
  { name: 'SS1', category: 'SSS' },
  { name: 'SS2', category: 'SSS' },
  { name: 'SS3', category: 'SSS' },
] as const;

const DEFAULT_SUBJECTS = [
  'English Language',
  'Mathematics',
  'Basic Science',
  'Social Studies',
  'Civic Education',
  'Agricultural Science',
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const generateOTP = (): string =>
  crypto.randomInt(100000, 999999).toString();

const getLockoutKey = (email: string): string =>
  `lockout:${email.toLowerCase()}`;

const getAttemptsKey = (email: string): string =>
  `attempts:${email.toLowerCase()}`;

// Check if account is locked out
const checkLockout = async (email: string): Promise<void> => {
  const locked = await redisGet(getLockoutKey(email));
  if (locked) {
    const ttl = parseInt(locked);
    const minutesLeft = Math.ceil((ttl - Date.now()) / 60000);
    throw new ApiError(
      429,
      `Account temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`
    );
  }
};

// Increment failed attempts and lock if threshold reached
const recordFailedAttempt = async (email: string): Promise<void> => {
  const key = getAttemptsKey(email);
  const current = await redisGet(key);
  const attempts = current ? parseInt(current) + 1 : 1;

  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    const lockoutUntil = Date.now() + LOCKOUT_MINUTES * 60 * 1000;
    // Lock the account
    await redisSet(getLockoutKey(email), lockoutUntil.toString(), LOCKOUT_MINUTES * 60);
    // Clear attempts counter
    await redisDel(key);
    throw new ApiError(
      429,
      `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`
    );
  }

  // Store attempts with a 15 minute TTL
  await redisSet(key, attempts.toString(), LOCKOUT_MINUTES * 60);
};

// Clear failed attempts on successful login
const clearFailedAttempts = async (email: string): Promise<void> => {
  await Promise.all([
    redisDel(getAttemptsKey(email)),
    redisDel(getLockoutKey(email)),
  ]);
};

// Build safe user response — never expose passwordHash
const safeUser = (user: any) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  middleName: user.middleName,
  email: user.email,
  phone: user.phone,
  gender: user.gender,
  role: user.role,
  staffId: user.staffId,
  admissionNumber: user.admissionNumber,
  schoolId: user.schoolId,
  branchId: user.branchId,
  isActive: user.isActive,
  isEmailVerified: user.isEmailVerified,
  profileImageUrl: user.profileImageUrl,
  passportUrl: user.passportUrl,
  notificationPrefs: user.notificationPrefs,
  lastLoginAt: user.lastLoginAt,
});

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER SCHOOL
// ─────────────────────────────────────────────────────────────────────────────
export const registerSchool = async (body: {
  schoolName: string;
  branchName: string;
  branchAddress: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
  phone?: string;
}) => {
  // NOTE: Logo upload is NOT part of registration.
  // After logging in the admin uploads their logo via POST /api/schools/logo
  // The logo is stored on both School and main Branch documents.

  const emailExists = await User.findOne({
    email: body.adminEmail.toLowerCase().trim(),
  }).lean();
  if (emailExists) throw ApiError.conflict('This email is already registered');

  const trialEndsAt = dayjs().add(env.DEFAULT_TRIAL_DAYS, 'day').toDate();
  const slug =
    slugify(body.schoolName, { lower: true, strict: true }) +
    '-' +
    uuidv4().slice(0, 6);

  // Create school
  const school = await School.create({
    name: body.schoolName.trim(),
    slug,
    email: body.adminEmail.toLowerCase().trim(),
    phone: body.phone?.trim(),
    trialEndsAt,
    subscriptionStatus: 'trial',
    isActive: true,
  });

  // Create main branch
  const branch = await Branch.create({
    schoolId: school._id,
    name: body.branchName.trim() || 'Main Branch',
    address: body.branchAddress.trim(),
    phone: body.phone?.trim(),
    email: body.adminEmail.toLowerCase().trim(),
    isMainBranch: true,
    isActive: true,
  });

  // Create school admin user
  const passwordHash = await bcrypt.hash(body.adminPassword, 12);
  const admin = await User.create({
    schoolId: school._id,
    branchId: branch._id,
    role: 'schooladmin',
    firstName: body.adminFirstName.trim(),
    lastName: body.adminLastName.trim(),
    email: body.adminEmail.toLowerCase().trim(),
    phone: body.phone?.trim(),
    passwordHash,
    isActive: true,
    isEmailVerified: false,
    notificationPrefs: { email: true, inApp: true, sms: false },
  });

 
// After creating the admin user, generate QR code for attendance
const adminQR = await generateQRCode({
  type: 'admin',
  id: (admin._id as any).toString(),
  schoolId: (school._id as any).toString(),
  branchId: (branch._id as any).toString(),
  identifier: `ADMIN-${(admin._id as any).toString().slice(-6).toUpperCase()}`,
  name: `${body.adminFirstName} ${body.adminLastName}`,
});

await User.findByIdAndUpdate(admin._id, {
  qrCodeData: adminQR.qrCodeData,
  qrCodeUrl: adminQR.qrCodeUrl,
});

  // Auto-seed classes for main branch
  const classIds = await Class.insertMany(
    DEFAULT_CLASSES.map((c) => ({
      schoolId: school._id,
      branchId: branch._id,
      name: c.name,
      category: c.category,
      isActive: true,
    }))
  );

  // Auto-seed default subjects for every class
  await Subject.insertMany(
    classIds.flatMap((cls) =>
      DEFAULT_SUBJECTS.map((name) => ({
        schoolId: school._id,
        branchId: branch._id,
        classId: cls._id,
        name,
        isDefault: true,
        isActive: true,
      }))
    )
  );

  // Sign JWT
  const token = signToken({
    userId: (admin._id as any).toString(),
    schoolId: (school._id as any).toString(),
    branchId: (branch._id as any).toString(),
    role: 'schooladmin',
  });

  // Send welcome email
  try {
    const { subject, html } = schoolWelcomeTemplate({
      adminName: `${body.adminFirstName} ${body.adminLastName}`,
      schoolName: body.schoolName,
      branchName: body.branchName || 'Main Branch',
      email: body.adminEmail,
      loginUrl: `${env.FRONTEND_URL}/login`,
      trialDays: env.DEFAULT_TRIAL_DAYS,
    });
    await sendEmail(body.adminEmail, subject, html);
  } catch {
    // Never fail registration because of email
  }

  // Send email verification OTP
  await sendVerificationOTP(body.adminEmail, body.adminFirstName);

  await logAudit({
    schoolId: (school._id as any).toString(),
    branchId: (branch._id as any).toString(),
    actorId: (admin._id as any).toString(),
    action: 'SCHOOL_REGISTERED',
    entity: 'School',
    entityId: (school._id as any).toString(),
    metadata: {
      schoolName: body.schoolName,
      adminEmail: body.adminEmail,
      classesSeeded: classIds.length,
      subjectsSeeded: classIds.length * DEFAULT_SUBJECTS.length,
    },
  });

  return {
    token,
    school: {
      id: school._id,
      name: school.name,
      slug: school.slug,
      subscriptionStatus: school.subscriptionStatus,
      trialEndsAt: school.trialEndsAt,
    },
    branch: {
      id: branch._id,
      name: branch.name,
      isMainBranch: branch.isMainBranch,
    },
    admin: safeUser(admin),
    requiresEmailVerification: true,
    message: 'Registration successful. A 6-digit OTP has been sent to your email address.',
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN — EMAIL + PASSWORD
// Handles: schooladmin, teacher (and superadmin)
// ─────────────────────────────────────────────────────────────────────────────
export const loginEmailPassword = async (
  email: string,
  password: string
) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Check lockout before doing any DB queries
  await checkLockout(normalizedEmail);

  // Find user — include passwordHash explicitly since it is select: false
  const user = await User.findOne({
    email: normalizedEmail,
    role: { $in: ['schooladmin', 'teacher', 'superadmin'] },
  }).select('+passwordHash');

  if (!user) {
    await recordFailedAttempt(normalizedEmail);
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Check account is active
  if (!user.isActive) {
    throw new ApiError(
      403,
      'Your account has been deactivated. Please contact your school administrator.'
    );
  }

  // Verify password
  if (!user.passwordHash) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    await recordFailedAttempt(normalizedEmail);
    throw ApiError.unauthorized('Invalid email or password');
  }

  // For school users check school is still active
  if (user.role !== 'superadmin') {
    const school = await School.findById(user.schoolId)
      .select('subscriptionStatus isActive name')
      .lean();

    if (!school || !school.isActive) {
      throw new ApiError(403, 'Your school account has been deactivated. Please contact support.');
    }

    if (school.subscriptionStatus === 'suspended') {
      throw new ApiError(
        403,
        'Your school subscription has been suspended. Please contact support.'
      );
    }
  }

  // Login successful — clear any failed attempts
  await clearFailedAttempts(normalizedEmail);

  // Update last login timestamp
  await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

  // Sign JWT
  const token = signToken({
    userId: (user._id as any).toString(),
    schoolId: (user.schoolId as any)?.toString() || '',
    branchId: (user.branchId as any)?.toString() || '',
    role: user.role,
  });

  // Warn if email is not verified (soft warning, not a hard block)
  const emailVerificationWarning = !user.isEmailVerified
    ? 'Your email address is not verified. Please verify it to ensure uninterrupted access.'
    : null;

  return {
    token,
    user: safeUser(user),
    warning: emailVerificationWarning,
    message: `Welcome back, ${user.firstName}!`,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN — STUDENT PORTAL
// Students log in with admissionNumber + lastName + schoolId + branchId
// ─────────────────────────────────────────────────────────────────────────────
export const loginStudent = async (
  schoolId: string,
  branchId: string,
  admissionNumber: string,
  lastName: string
) => {
  const normalizedAdmission = admissionNumber.trim().toUpperCase();
  const normalizedSurname = lastName.trim().toLowerCase();

  const student = await User.findOne({
    schoolId,
    branchId,
    admissionNumber: normalizedAdmission,
    role: 'student',
  }).lean();

  if (!student) {
    throw ApiError.unauthorized('Student not found. Check your admission number and try again.');
  }

  if (!student.isActive) {
    throw new ApiError(
      403,
      'Your student account has been deactivated. Please contact your school.'
    );
  }

  if (student.lastName.toLowerCase() !== normalizedSurname) {
    throw ApiError.unauthorized('Surname does not match our records.');
  }

  // Check school is active
  const school = await School.findById(schoolId)
    .select('subscriptionStatus isActive')
    .lean();

  if (!school || !school.isActive || school.subscriptionStatus === 'suspended') {
    throw new ApiError(403, 'School is currently unavailable. Please contact your school administrator.');
  }

  const token = signToken({
    userId: (student._id as any).toString(),
    schoolId: (student.schoolId as any).toString(),
    branchId: (student.branchId as any).toString(),
    role: 'student',
  });

  await User.findByIdAndUpdate(student._id, { lastLoginAt: new Date() });

  return {
    token,
    user: safeUser(student),
    message: `Welcome, ${student.firstName}!`,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN — PARENT PORTAL
// Parents log in with phone + surname + schoolId + branchId
// ─────────────────────────────────────────────────────────────────────────────
export const loginParent = async (
  schoolId: string,
  branchId: string,
  phone: string,
  surname: string
) => {
  const normalizedPhone = phone.trim();
  const normalizedSurname = surname.trim().toLowerCase();

  const parent = await User.findOne({
    schoolId,
    branchId,
    phone: normalizedPhone,
    role: 'parent',
  }).lean();

  if (!parent) {
    throw ApiError.unauthorized('Parent not found. Check your phone number and try again.');
  }

  if (!parent.isActive) {
    throw new ApiError(
      403,
      'Your account has been deactivated. Please contact the school.'
    );
  }

  if (parent.lastName.toLowerCase() !== normalizedSurname) {
    throw ApiError.unauthorized('Surname does not match our records.');
  }

  // Check school is active
  const school = await School.findById(schoolId)
    .select('subscriptionStatus isActive')
    .lean();

  if (!school || !school.isActive || school.subscriptionStatus === 'suspended') {
    throw new ApiError(403, 'School is currently unavailable. Please contact your school administrator.');
  }

  const token = signToken({
    userId: (parent._id as any).toString(),
    schoolId: (parent.schoolId as any).toString(),
    branchId: (parent.branchId as any).toString(),
    role: 'parent',
  });

  await User.findByIdAndUpdate(parent._id, { lastLoginAt: new Date() });

  // Fetch linked students
  const linkedStudents = await User.find({
    _id: { $in: parent.linkedStudents || [] },
    isActive: true,
  })
    .select('firstName lastName admissionNumber classId passportUrl')
    .populate('classId', 'name category')
    .lean();

  return {
    token,
    user: safeUser(parent),
    linkedStudents,
    message: `Welcome, ${parent.firstName}!`,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// LOGOUT — Blacklist token in Redis
// ─────────────────────────────────────────────────────────────────────────────
export const logout = async (token: string): Promise<void> => {
  // Blacklist for 7 days (matches JWT expiry)
  await redisSet(`blacklist:${token}`, '1', 7 * 24 * 60 * 60);
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ME — Return full profile of logged in user
// ─────────────────────────────────────────────────────────────────────────────
export const getMe = async (userId: string) => {
  const user = await User.findById(userId)
    .select('-passwordHash -profileImagePublicId -passportPublicId -__v')
    .populate('classId', 'name category')
    .lean();

  if (!user) throw ApiError.notFound('User not found');

  // For parents also return linked students
  if (user.role === 'parent') {
    const linkedStudents = await User.find({
      _id: { $in: user.linkedStudents || [] },
      isActive: true,
    })
      .select('firstName lastName admissionNumber classId passportUrl')
      .populate('classId', 'name category')
      .lean();

    return { ...user, linkedStudents };
  }

  // For teachers return their classes and subjects
  if (user.role === 'teacher') {
    const [assignedClasses, assignedSubjects] = await Promise.all([
      Class.find({ schoolId: user.schoolId, branchId: user.branchId, formTeacherId: userId })
        .select('name category studentIds')
        .lean(),
      Subject.find({ schoolId: user.schoolId, branchId: user.branchId, teacherId: userId })
        .select('name code classId')
        .populate('classId', 'name')
        .lean(),
    ]);

    return { ...user, assignedClasses, assignedSubjects };
  }

  return user;
};

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE OWN PASSWORD
// ─────────────────────────────────────────────────────────────────────────────
export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
) => {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.notFound('User not found');

  if (!user.passwordHash) {
    throw ApiError.badRequest('No password set on this account');
  }

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) throw ApiError.unauthorized('Current password is incorrect');

  if (currentPassword === newPassword) {
    throw ApiError.badRequest('New password must be different from your current password');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.passwordChangedAt = new Date();
  await user.save();

  return { changed: true, message: 'Password changed successfully' };
};

// ─────────────────────────────────────────────────────────────────────────────
// SEND VERIFICATION OTP
// ─────────────────────────────────────────────────────────────────────────────
export const sendVerificationOTP = async (
  email: string,
  firstName: string
): Promise<{ message: string; expiryMinutes: number }> => {
  const normalizedEmail = email.toLowerCase().trim();

  // Delete any existing unused OTP for this email
  await OTP.deleteMany({
    email: normalizedEmail,
    type: 'email_verification',
    verified: false,
  });

  const otp = generateOTP();

  await OTP.create({
    email: normalizedEmail,
    otp,
    type: 'email_verification',
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
    verified: false,
    attempts: 0,
  });

  try {
    const { subject, html } = otpVerificationTemplate({
      firstName,
      otp,
      expiryMinutes: OTP_EXPIRY_MINUTES,
    });
    await sendEmail(normalizedEmail, subject, html);
  } catch {
    // Never fail because of email
  }

  return {
    message: `A ${OTP_EXPIRY_MINUTES}-minute OTP has been sent to ${normalizedEmail}`,
    expiryMinutes: OTP_EXPIRY_MINUTES,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY EMAIL OTP
// ─────────────────────────────────────────────────────────────────────────────
export const verifyEmailOTP = async (
  email: string,
  otp: string
): Promise<{ verified: boolean; message: string }> => {
  const normalizedEmail = email.toLowerCase().trim();

  const record = await OTP.findOne({
    email: normalizedEmail,
    type: 'email_verification',
    verified: false,
  });

  if (!record) {
    throw ApiError.notFound('OTP not found or already used. Please request a new one.');
  }

  // Check expiry
  if (record.expiresAt < new Date()) {
    await OTP.deleteOne({ _id: record._id });
    throw new ApiError(410, 'OTP has expired. Please request a new one.');
  }

  // Check max attempts
  if (record.attempts >= 5) {
    await OTP.deleteOne({ _id: record._id });
    throw new ApiError(
      429,
      'Too many incorrect attempts. Please request a new OTP.'
    );
  }

  // Check OTP value
  if (record.otp !== otp.trim()) {
    await OTP.findByIdAndUpdate(record._id, { $inc: { attempts: 1 } });
    const attemptsLeft = 4 - record.attempts;
    throw new ApiError(
      400,
      `Incorrect OTP. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`
    );
  }

  // OTP correct — mark as verified
  await OTP.findByIdAndUpdate(record._id, { verified: true });

  // Mark user email as verified
  await User.findOneAndUpdate(
    { email: normalizedEmail },
    { isEmailVerified: true }
  );

  // Send confirmation email
  const user = await User.findOne({ email: normalizedEmail })
    .select('firstName')
    .lean();

  if (user) {
    try {
      const { subject, html } = emailVerifiedTemplate({
        firstName: user.firstName,
        loginUrl: `${env.FRONTEND_URL}/login`,
      });
      await sendEmail(normalizedEmail, subject, html);
    } catch {
      // Non-blocking
    }
  }

  return {
    verified: true,
    message: 'Email verified successfully. You now have full access to your account.',
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// RESEND OTP
// ─────────────────────────────────────────────────────────────────────────────
export const resendVerificationOTP = async (
  email: string
): Promise<{ message: string; expiryMinutes: number }> => {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail })
    .select('firstName isEmailVerified')
    .lean();

  if (!user) throw ApiError.notFound('This email is not registered');
  if (user.isEmailVerified) {
    throw ApiError.badRequest('This email is already verified. No need to resend.');
  }

  return sendVerificationOTP(normalizedEmail, user.firstName);
};

// import bcrypt from 'bcryptjs';
// import slugify from 'slugify';
// import dayjs from 'dayjs';
// import { v4 as uuidv4 } from 'uuid';
// import { User } from '../../shared/models/User';
// import { School } from '../../shared/models/School';
// import { Branch } from '../../shared/models/Branch';
// import { Class } from '../../shared/models/Class';
// import { Subject } from '../../shared/models/Subject';
// import { signToken } from '../../shared/utils/jwt';
// import { ApiError } from '../../shared/utils/ApiError';
// import { env } from '../../config/env';
// import { logAudit } from '../../shared/utils/auditLogger';
// import { sendEmail, schoolWelcomeTemplate, otpVerificationTemplate, emailVerifiedTemplate } from '../../shared/utils/emailTemplates';
// import { redisSet } from '../../config/redis';
// import { NIGERIAN_CURRICULUM } from '../../shared/constants/subjects';
// import { OTP } from '../../shared/models/OTP';
// import crypto from 'crypto';

// // ─── UTILS ────────────────────────────────────────────────────────────────────
// const generateOTP = (): string => crypto.randomInt(100000, 999999).toString();

// const DEFAULT_CLASSES = [
//   { name: 'KG 1', category: 'KG' }, { name: 'KG 2', category: 'KG' },
//   { name: 'Nursery 1', category: 'NURSERY' }, { name: 'Nursery 2', category: 'NURSERY' },
//   { name: 'Primary 1', category: 'PRIMARY' }, { name: 'Primary 2', category: 'PRIMARY' },
//   { name: 'Primary 3', category: 'PRIMARY' }, { name: 'Primary 4', category: 'PRIMARY' },
//   { name: 'Primary 5', category: 'PRIMARY' }, { name: 'Primary 6', category: 'PRIMARY' },
//   { name: 'JSS 1', category: 'JSS' }, { name: 'JSS 2', category: 'JSS' }, { name: 'JSS 3', category: 'JSS' },
//   { name: 'SS 1', category: 'SSS' }, { name: 'SS 2', category: 'SSS' }, { name: 'SS 3', category: 'SSS' },
// ] as const;

// const CURRICULUM_MAP: Record<string, keyof typeof NIGERIAN_CURRICULUM> = {
//   'KG': 'KINDERGARTEN_NURSERY',
//   'NURSERY': 'KINDERGARTEN_NURSERY',
//   'PRIMARY': 'PRIMARY_SCHOOL',
//   'JSS': 'JUNIOR_SECONDARY',
//   'SSS': 'SENIOR_SECONDARY'
// };

// // ─── SEND VERIFICATION OTP ────────────────────────────────────────────────────
// export const sendVerificationOTP = async (email: string, firstName: string) => {
//   await OTP.deleteMany({ email: email.toLowerCase(), type: 'email_verification' });

//   const otp = generateOTP();
//   const expiryMinutes = 10;

//   await OTP.create({
//     email: email.toLowerCase(),
//     otp,
//     type: 'email_verification',
//     expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
//     verified: false,
//     attempts: 0,
//   });

//   const { subject, html } = otpVerificationTemplate({ firstName, otp, expiryMinutes });
//   await sendEmail(email, subject, html);

//   return { message: 'OTP sent to your email', expiryMinutes };
// };

// // ─── VERIFY OTP ───────────────────────────────────────────────────────────────
// export const verifyEmailOTP = async (email: string, otp: string) => {
//   const record = await OTP.findOne({ email: email.toLowerCase(), type: 'email_verification', verified: false });

//   if (!record) throw ApiError.notFound('OTP not found. Please request a new one.');
//   if (record.expiresAt < new Date()) {
//     await OTP.deleteOne({ _id: record._id });
//     throw new ApiError(410, 'OTP has expired. Please request a new one.');
//   }

//   if (record.attempts >= 5) {
//     await OTP.deleteOne({ _id: record._id });
//     throw new ApiError(429, 'Too many failed attempts. Please request a new OTP.');
//   }

//   if (record.otp !== otp) {
//     await OTP.findByIdAndUpdate(record._id, { $inc: { attempts: 1 } });
//     const attemptsLeft = 4 - record.attempts;
//     throw new ApiError(400, `Incorrect OTP. ${attemptsLeft} attempts remaining.`);
//   }

//   await OTP.findByIdAndUpdate(record._id, { verified: true });
//   await User.findOneAndUpdate({ email: email.toLowerCase() }, { isEmailVerified: true });

//   const user = await User.findOne({ email: email.toLowerCase() }).select('firstName');
//   if (user) {
//     const { subject, html } = emailVerifiedTemplate({
//       firstName: user.firstName,
//       loginUrl: `${env.FRONTEND_URL}/login`,
//     });
//     await sendEmail(email, subject, html);
//   }

//   return { verified: true, message: 'Email verified successfully. You can now log in.' };
// };

// // ─── RESEND OTP ───────────────────────────────────────────────────────────────
// export const resendVerificationOTP = async (email: string) => {
//   const user = await User.findOne({ email: email.toLowerCase() }).select('firstName isEmailVerified');
//   if (!user) throw ApiError.notFound('Email not registered');
//   if (user.isEmailVerified) throw ApiError.badRequest('Email is already verified');
//   return sendVerificationOTP(email, user.firstName);
// };

// // ─── REGISTER SCHOOL ──────────────────────────────────────────────────────────
// export const registerSchool = async (body: {
//   schoolName: string;
//   branchName: string;
//   branchAddress: string;
//   adminEmail: string;
//   adminPassword: string;
//   adminFirstName: string;
//   adminLastName: string;
//   phone?: string;
// }) => {
//   const emailExists = await User.findOne({ email: body.adminEmail.toLowerCase() });
//   if (emailExists) throw ApiError.conflict('Email already registered');

//   const trialEndsAt = dayjs().add(env.DEFAULT_TRIAL_DAYS, 'day').toDate();
//   const slug = `${slugify(body.schoolName, { lower: true, strict: true })}-${uuidv4().slice(0, 6)}`;

//   const school = await School.create({
//     name: body.schoolName,
//     slug,
//     email: body.adminEmail.toLowerCase(),
//     phone: body.phone,
//     trialEndsAt,
//   });

//   const branch = await Branch.create({
//     schoolId: school._id,
//     name: body.branchName || 'Main Branch',
//     address: body.branchAddress,
//     phone: body.phone,
//     email: body.adminEmail.toLowerCase(),
//     isMainBranch: true,
//     isActive: true,
//   });

//   const passwordHash = await bcrypt.hash(body.adminPassword, 12);
//   const admin = await User.create({
//     schoolId: school._id,
//     branchId: branch._id,
//     role: 'schooladmin',
//     firstName: body.adminFirstName,
//     lastName: body.adminLastName,
//     email: body.adminEmail.toLowerCase(),
//     passwordHash,
//   });

//   const createdClasses = await Class.insertMany(
//     DEFAULT_CLASSES.map((c) => ({
//       schoolId: school._id,
//       branchId: branch._id,
//       name: c.name,
//       category: c.category,
//     }))
//   );

//   const subjectsToInsert = createdClasses.flatMap((cls) => {
//     const curriculumKey = CURRICULUM_MAP[cls.category as string];
//     const subjectNames = NIGERIAN_CURRICULUM[curriculumKey] || [];
//     return subjectNames.map((name) => ({
//       schoolId: school._id,
//       branchId: branch._id,
//       classId: cls._id,
//       name,
//       category: cls.category,
//       isDefault: true,
//       isActive: true
//     }));
//   });

//   if (subjectsToInsert.length > 0) await Subject.insertMany(subjectsToInsert);

//   const token = signToken({
//     userId: (admin._id as any).toString(),
//     schoolId: (school._id as any).toString(),
//     branchId: (branch._id as any).toString(),
//     role: 'schooladmin',
//   });

//   const { subject, html } = schoolWelcomeTemplate({
//     adminName: `${body.adminFirstName} ${body.adminLastName}`,
//     schoolName: body.schoolName,
//     branchName: body.branchName || 'Main Branch',
//     email: body.adminEmail,
//     loginUrl: `${env.FRONTEND_URL}/login`,
//     trialDays: env.DEFAULT_TRIAL_DAYS,
//   });
  
//   await sendEmail(body.adminEmail, subject, html);
//   await sendVerificationOTP(body.adminEmail, body.adminFirstName);

//   await logAudit({
//     schoolId: (school._id as any).toString(),
//     branchId: (branch._id as any).toString(),
//     actorId: (admin._id as any).toString(),
//     action: 'SCHOOL_REGISTERED',
//     entity: 'School',
//     entityId: (school._id as any).toString(),
//   });

//   return {
//     token,
//     school: { id: school._id, name: school.name, slug: school.slug, trialEndsAt },
//     branch: { id: branch._id, name: branch.name },
//     admin: { id: admin._id, email: admin.email, role: admin.role },
//     requiresEmailVerification: true,
//     message: 'Registration successful. A verification OTP has been sent to your email.',
//   };
// };

// // ─── LOGIN EMAIL/PASSWORD ────────────────────────────────────────────────────
// export const loginEmailPassword = async (email: string, password: string) => {
//   const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
//   if (!user || !user.passwordHash) throw ApiError.unauthorized('Invalid credentials');
//   if (!user.isActive) throw ApiError.forbidden('Account is deactivated');

//   const match = await bcrypt.compare(password, user.passwordHash);
//   if (!match) throw ApiError.unauthorized('Invalid credentials');

//   const emailVerificationWarning = !user.isEmailVerified
//     ? 'Your email is not verified. Please verify it to continue using your account.'
//     : null;

//   user.lastLoginAt = new Date();
//   await user.save();

//   const token = signToken({
//     userId: (user._id as any).toString(),
//     schoolId: (user.schoolId as any).toString(),
//     branchId: (user.branchId as any).toString(),
//     role: user.role,
//   });

//   return {
//     token,
//     user: {
//       id: user._id,
//       firstName: user.firstName,
//       lastName: user.lastName,
//       email: user.email,
//       role: user.role,
//       schoolId: user.schoolId,
//       branchId: user.branchId,
//       isEmailVerified: user.isEmailVerified,
//     },
//     warning: emailVerificationWarning,
//   };
// };

// // ─── LOGIN STUDENT ────────────────────────────────────────────────────────────
// export const loginStudent = async (schoolId: string, branchId: string, admissionNumber: string, lastName: string) => {
//   const student = await User.findOne({
//     schoolId, branchId,
//     admissionNumber: admissionNumber.trim().toUpperCase(),
//     role: 'student',
//     isActive: true,
//   });

//   if (!student || student.lastName.toLowerCase() !== lastName.trim().toLowerCase()) {
//     throw ApiError.unauthorized('Invalid admission number or surname');
//   }

//   return {
//     token: signToken({
//       userId: student._id.toString(),
//       schoolId: student.schoolId.toString(),
//       branchId: student.branchId.toString(),
//       role: 'student',
//     }),
//     student: { id: student._id, firstName: student.firstName, admissionNumber: student.admissionNumber }
//   };
// };

// // ─── LOGIN PARENT ─────────────────────────────────────────────────────────────
// export const loginParent = async (schoolId: string, branchId: string, phone: string, surname: string) => {
//   const parent = await User.findOne({ schoolId, branchId, phone, role: 'parent', isActive: true });
  
//   if (!parent || parent.lastName.toLowerCase() !== surname.trim().toLowerCase()) {
//     throw ApiError.unauthorized('Invalid phone number or surname');
//   }

//   return {
//     token: signToken({
//       userId: parent._id.toString(),
//       schoolId: parent.schoolId.toString(),
//       branchId: parent.branchId.toString(),
//       role: 'parent',
//     }),
//     parent: { id: parent._id, firstName: parent.firstName }
//   };
// };

// // ─── LOGOUT ───────────────────────────────────────────────────────────────────
// export const logout = async (token: string): Promise<void> => {
//   await redisSet(`blacklist:${token}`, '1', 7 * 24 * 60 * 60);
// };

// export default {
//   sendVerificationOTP,
//   verifyEmailOTP,
//   resendVerificationOTP,
//   registerSchool,
//   loginEmailPassword,
//   loginStudent,
//   loginParent,
//   logout,
// };