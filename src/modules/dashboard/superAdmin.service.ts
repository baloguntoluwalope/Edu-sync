import dayjs from 'dayjs';
import { School } from '../../shared/models/School';
import { Branch } from '../../shared/models/Branch';
import { User } from '../../shared/models/User';
import { Subscription } from '../../shared/models/Subscription';
import { Attendance } from '../../shared/models/Attendance';
import { CBTSubmission } from '../../shared/models/CBTSubmission';
import { AuditLog } from '../../shared/models/AuditLog';
import { Notification } from '../../shared/models/Notification';
import { EmailTemplate } from '../../shared/models/EmailTemplate';
import { EmailBroadcast } from '../../shared/models/EmailBroadcast';
import { PlatformSettings } from '../../shared/models/PlatformSettings';
import { ApiError } from '../../shared/utils/ApiError';
import { getPagination, paginatedResponse } from '../../shared/utils/pagination';
import { redisCacheOrFetch, redisDel } from '../../config/redis';
import { deleteCloudinaryFile } from '../../config/cloudinary';
import { sendEmail } from '../../config/mailer';
import { broadcastTemplate } from '../../shared/utils/emailTemplates';
import { logger } from '../../config/logger';

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────
export const getPlatformOverview = async () => {
  return redisCacheOrFetch('superadmin:overview', 120, async () => {
    const today = dayjs().format('YYYY-MM-DD');

    const [
      totalSchools,
      activeSchools,
      trialSchools,
      expiredSchools,
      suspendedSchools,
      totalBranches,
      totalStudents,
      totalTeachers,
      totalParents,
      totalAdmins,
      todayAttendance,
      todayCBTSubmissions,
      totalSubscriptionsPaid,
      thisMonthRevenue,
      lastMonthRevenue,
      newSchoolsThisMonth,
      newSchoolsLastMonth,
    ] = await Promise.all([
      School.countDocuments(),
      School.countDocuments({ subscriptionStatus: 'active', isActive: true }),
      School.countDocuments({ subscriptionStatus: 'trial', isActive: true }),
      School.countDocuments({ subscriptionStatus: 'expired' }),
      School.countDocuments({ subscriptionStatus: 'suspended' }),
      Branch.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'student', isActive: true }),
      User.countDocuments({ role: 'teacher', isActive: true }),
      User.countDocuments({ role: 'parent', isActive: true }),
      User.countDocuments({ role: 'schooladmin', isActive: true }),
      Attendance.countDocuments({ date: today }),
      CBTSubmission.countDocuments({
        createdAt: { $gte: dayjs().startOf('day').toDate() },
      }),
      Subscription.countDocuments({ status: 'paid' }),
      Subscription.aggregate([
        {
          $match: {
            status: 'paid',
            paidAt: {
              $gte: dayjs().startOf('month').toDate(),
              $lte: dayjs().endOf('month').toDate(),
            },
          },
        },
        { $group: { _id: null, total: { $sum: '$amountNaira' } } },
      ]),
      Subscription.aggregate([
        {
          $match: {
            status: 'paid',
            paidAt: {
              $gte: dayjs().subtract(1, 'month').startOf('month').toDate(),
              $lte: dayjs().subtract(1, 'month').endOf('month').toDate(),
            },
          },
        },
        { $group: { _id: null, total: { $sum: '$amountNaira' } } },
      ]),
      School.countDocuments({
        createdAt: {
          $gte: dayjs().startOf('month').toDate(),
          $lte: dayjs().endOf('month').toDate(),
        },
      }),
      School.countDocuments({
        createdAt: {
          $gte: dayjs().subtract(1, 'month').startOf('month').toDate(),
          $lte: dayjs().subtract(1, 'month').endOf('month').toDate(),
        },
      }),
    ]);

    const thisMonthRevenueNaira = thisMonthRevenue[0]?.total || 0;
    const lastMonthRevenueNaira = lastMonthRevenue[0]?.total || 0;
    const revenueGrowth =
      lastMonthRevenueNaira > 0
        ? Math.round(
            ((thisMonthRevenueNaira - lastMonthRevenueNaira) /
              lastMonthRevenueNaira) *
              100
          )
        : 100;

    const schoolGrowth =
      newSchoolsLastMonth > 0
        ? Math.round(
            ((newSchoolsThisMonth - newSchoolsLastMonth) /
              newSchoolsLastMonth) *
              100
          )
        : 100;

    return {
      schools: {
        total: totalSchools,
        active: activeSchools,
        trial: trialSchools,
        expired: expiredSchools,
        suspended: suspendedSchools,
        newThisMonth: newSchoolsThisMonth,
        growthPercent: schoolGrowth,
      },
      branches: { total: totalBranches },
      users: {
        students: totalStudents,
        teachers: totalTeachers,
        parents: totalParents,
        admins: totalAdmins,
        total: totalStudents + totalTeachers + totalParents + totalAdmins,
      },
      activity: {
        todayAttendanceMarked: todayAttendance,
        todayCBTSubmissions,
      },
      revenue: {
        thisMonthNaira: thisMonthRevenueNaira,
        lastMonthNaira: lastMonthRevenueNaira,
        growthPercent: revenueGrowth,
        totalPaidSubscriptions: totalSubscriptionsPaid,
      },
    };
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// ALL SCHOOLS
// ─────────────────────────────────────────────────────────────────────────────
export const getAllSchools = async (
  page = 1,
  limit = 20,
  status?: string,
  search?: string
) => {
  const { skip } = getPagination(page, limit);
  const query: Record<string, unknown> = {};
  if (status) query.subscriptionStatus = status;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];
  }

  const [data, total] = await Promise.all([
    School.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    School.countDocuments(query),
  ]);

  return paginatedResponse(data, total, page, limit);
};

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE SCHOOL DETAIL
// ─────────────────────────────────────────────────────────────────────────────
export const getSchoolDetail = async (schoolId: string) => {
  const school = await School.findById(schoolId).lean();
  if (!school) throw ApiError.notFound('School not found');

  const [
    branches,
    totalStudents,
    totalTeachers,
    totalParents,
    subscriptions,
    recentAuditLogs,
  ] = await Promise.all([
    Branch.find({ schoolId }).lean(),
    User.countDocuments({ schoolId, role: 'student', isActive: true }),
    User.countDocuments({ schoolId, role: 'teacher', isActive: true }),
    User.countDocuments({ schoolId, role: 'parent', isActive: true }),
    Subscription.find({ schoolId }).sort({ createdAt: -1 }).limit(5).lean(),
    AuditLog.find({ schoolId }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  const totalRevenue = subscriptions
    .filter((s) => s.status === 'paid')
    .reduce((acc, s) => acc + s.amountNaira, 0);

  return {
    school,
    branches,
    users: { totalStudents, totalTeachers, totalParents },
    subscriptions,
    totalRevenuePaidNaira: totalRevenue,
    recentAuditLogs,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// ALL SUBSCRIPTIONS
// ─────────────────────────────────────────────────────────────────────────────
export const getAllSubscriptions = async (
  page = 1,
  limit = 20,
  status?: string,
  plan?: string
) => {
  const { skip } = getPagination(page, limit);
  const query: Record<string, unknown> = {};
  if (status) query.status = status;
  if (plan) query.plan = plan;

  const [data, total] = await Promise.all([
    Subscription.find(query)
      .populate('schoolId', 'name email slug')
      .populate('initiatedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Subscription.countDocuments(query),
  ]);

  return paginatedResponse(data, total, page, limit);
};

// ─────────────────────────────────────────────────────────────────────────────
// REVENUE ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────
export const getRevenueAnalytics = async (months = 6) => {
  return redisCacheOrFetch(`superadmin:revenue:${months}`, 300, async () => {
    const results = [];

    for (let i = months - 1; i >= 0; i--) {
      const month = dayjs().subtract(i, 'month');
      const start = month.startOf('month').toDate();
      const end = month.endOf('month').toDate();

      const [revenue, count] = await Promise.all([
        Subscription.aggregate([
          { $match: { status: 'paid', paidAt: { $gte: start, $lte: end } } },
          { $group: { _id: null, total: { $sum: '$amountNaira' } } },
        ]),
        Subscription.countDocuments({
          status: 'paid',
          paidAt: { $gte: start, $lte: end },
        }),
      ]);

      results.push({
        month: month.format('MMM YYYY'),
        revenueNaira: revenue[0]?.total || 0,
        subscriptions: count,
      });
    }

    const totalAllTime = await Subscription.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amountNaira' } } },
    ]);

    const planBreakdown = await Subscription.aggregate([
      { $match: { status: 'paid' } },
      {
        $group: {
          _id: '$plan',
          count: { $sum: 1 },
          revenue: { $sum: '$amountNaira' },
        },
      },
    ]);

    return {
      monthly: results,
      totalAllTimeNaira: totalAllTime[0]?.total || 0,
      planBreakdown,
    };
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// SCHOOL ACTIONS
// ─────────────────────────────────────────────────────────────────────────────
export const suspendSchool = async (
  schoolId: string,
  actorId: string,
  reason: string
) => {
  const school = await School.findByIdAndUpdate(
    schoolId,
    { subscriptionStatus: 'suspended', isActive: false },
    { new: true }
  );
  if (!school) throw ApiError.notFound('School not found');

  await AuditLog.create({
    actorId,
    action: 'SCHOOL_SUSPENDED',
    entity: 'School',
    entityId: schoolId,
    metadata: { reason },
  });

  await redisDel('superadmin:overview');
  return school;
};

export const activateSchool = async (schoolId: string, actorId: string) => {
  const school = await School.findById(schoolId);
  if (!school) throw ApiError.notFound('School not found');

  const activeSub = await Subscription.findOne({ schoolId, status: 'paid' })
    .sort({ expiresAt: -1 })
    .lean();

  const newStatus =
    activeSub &&
    activeSub.expiresAt &&
    new Date(activeSub.expiresAt) > new Date()
      ? 'active'
      : 'trial';

  await School.findByIdAndUpdate(schoolId, {
    subscriptionStatus: newStatus,
    isActive: true,
  });

  await AuditLog.create({
    actorId,
    action: 'SCHOOL_ACTIVATED',
    entity: 'School',
    entityId: schoolId,
    metadata: { newStatus },
  });

  await redisDel('superadmin:overview');
  return { schoolId, newStatus };
};

export const extendTrial = async (
  schoolId: string,
  actorId: string,
  days: number
) => {
  const school = await School.findById(schoolId);
  if (!school) throw ApiError.notFound('School not found');

  const newTrialEnd = dayjs(school.trialEndsAt).add(days, 'day').toDate();

  await School.findByIdAndUpdate(schoolId, {
    trialEndsAt: newTrialEnd,
    subscriptionStatus: 'trial',
  });

  await AuditLog.create({
    actorId,
    action: 'TRIAL_EXTENDED',
    entity: 'School',
    entityId: schoolId,
    metadata: { days, newTrialEnd },
  });

  await redisDel('superadmin:overview');
  return { schoolId, newTrialEnd, addedDays: days };
};

export const manuallyMarkPaid = async (
  schoolId: string,
  actorId: string,
  plan: 'monthly' | 'termly' | 'annual',
  reference: string
) => {
  const PLAN_DAYS: Record<string, number> = {
    monthly: 30,
    termly: 120,
    annual: 365,
  };
  const PLAN_AMOUNTS: Record<string, number> = {
    monthly: 5000,
    termly: 12000,
    annual: 40000,
  };

  const expiresAt = dayjs().add(PLAN_DAYS[plan], 'day').toDate();

  const sub = await Subscription.create({
    schoolId,
    plan,
    amountNaira: PLAN_AMOUNTS[plan],
    paymentRef: reference || `MANUAL-${Date.now()}`,
    status: 'paid',
    paidAt: new Date(),
    expiresAt,
    provider: 'manual',
    initiatedBy: actorId,
    auditLog: [
      { action: 'MANUAL_PAYMENT_BY_SUPERADMIN', by: actorId, at: new Date() },
    ],
  });

  await School.findByIdAndUpdate(schoolId, {
    subscriptionStatus: 'active',
    subscriptionEndsAt: expiresAt,
    isActive: true,
  });

  await AuditLog.create({
    actorId,
    action: 'SUBSCRIPTION_MANUAL_PAID',
    entity: 'Subscription',
    entityId: (sub._id as any).toString(),
    metadata: { plan, expiresAt, reference },
  });

  await redisDel('superadmin:overview');
  return { subscription: sub, expiresAt };
};

// ─────────────────────────────────────────────────────────────────────────────
// ALL USERS
// ─────────────────────────────────────────────────────────────────────────────
export const getAllUsers = async (
  page = 1,
  limit = 20,
  role?: string,
  schoolId?: string,
  search?: string
) => {
  const { skip } = getPagination(page, limit);
  const query: Record<string, unknown> = {};
  if (role) query.role = role;
  if (schoolId) query.schoolId = schoolId;
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [data, total] = await Promise.all([
    User.find(query)
      .select('-passwordHash')
      .populate('schoolId', 'name slug')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  return paginatedResponse(data, total, page, limit);
};

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM AUDIT LOGS
// ─────────────────────────────────────────────────────────────────────────────
export const getPlatformAuditLogs = async (
  page = 1,
  limit = 50,
  schoolId?: string,
  action?: string
) => {
  const { skip } = getPagination(page, limit);
  const query: Record<string, unknown> = {};
  if (schoolId) query.schoolId = schoolId;
  if (action) query.action = { $regex: action, $options: 'i' };

  const [data, total] = await Promise.all([
    AuditLog.find(query)
      .populate('actorId', 'firstName lastName email role')
      .populate('schoolId', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(query),
  ]);

  return paginatedResponse(data, total, page, limit);
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPIRING SCHOOLS
// ─────────────────────────────────────────────────────────────────────────────
export const getExpiringSchools = async (withinDays = 7) => {
  const cutoff = dayjs().add(withinDays, 'day').toDate();
  const now = new Date();

  const [trialExpiring, subscriptionExpiring] = await Promise.all([
    School.find({
      subscriptionStatus: 'trial',
      trialEndsAt: { $gte: now, $lte: cutoff },
      isActive: true,
    }).lean(),
    School.find({
      subscriptionStatus: 'active',
      subscriptionEndsAt: { $gte: now, $lte: cutoff },
      isActive: true,
    }).lean(),
  ]);

  return {
    trialExpiring,
    subscriptionExpiring,
    totalExpiringSoon: trialExpiring.length + subscriptionExpiring.length,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM ACTIVITY FEED
// ─────────────────────────────────────────────────────────────────────────────
export const getActivityFeed = async (limit = 30) => {
  return redisCacheOrFetch(`superadmin:activity:${limit}`, 60, async () => {
    const [recentSchools, recentSubscriptions, recentAuditLogs] =
      await Promise.all([
        School.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select('name email subscriptionStatus createdAt')
          .lean(),
        Subscription.find({ status: 'paid' })
          .populate('schoolId', 'name')
          .sort({ paidAt: -1 })
          .limit(10)
          .lean(),
        AuditLog.find()
          .populate('actorId', 'firstName lastName role')
          .populate('schoolId', 'name')
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean(),
      ]);

    return { recentSchools, recentSubscriptions, recentAuditLogs };
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM HEALTH
// ─────────────────────────────────────────────────────────────────────────────
export const getSystemHealth = async () => {
  const { redis } = await import('../../config/redis');

  let redisStatus = 'ok';
  let redisPingMs = 0;
  try {
    const start = Date.now();
    await redis.ping();
    redisPingMs = Date.now() - start;
  } catch {
    redisStatus = 'error';
  }

  let dbStatus = 'ok';
  let dbPingMs = 0;
  try {
    const mongoose = await import('mongoose');
    const start = Date.now();
    await mongoose.connection.db?.admin().ping();
    dbPingMs = Date.now() - start;
  } catch {
    dbStatus = 'error';
  }

  const mem = process.memoryUsage();

  return {
    status:
      redisStatus === 'ok' && dbStatus === 'ok' ? 'healthy' : 'degraded',
    uptime: Math.floor(process.uptime()),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV,
    services: {
      database: { status: dbStatus, pingMs: dbPingMs },
      redis: { status: redisStatus, pingMs: redisPingMs },
    },
    memory: {
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      rssMB: Math.round(mem.rss / 1024 / 1024),
    },
    timestamp: new Date().toISOString(),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL TEMPLATES — CRUD
// ─────────────────────────────────────────────────────────────────────────────
export const createEmailTemplate = async (
  actorId: string,
  data: {
    name: string;
    description?: string;
    subject: string;
    bodyHtml: string;
    variables?: string[];
  }
) => {
  const exists = await EmailTemplate.findOne({ name: data.name });
  if (exists) throw ApiError.conflict('A template with this name already exists');

  return EmailTemplate.create({ ...data, createdBy: actorId });
};

export const listEmailTemplates = async (page = 1, limit = 20) => {
  const { skip } = getPagination(page, limit);
  const [data, total] = await Promise.all([
    EmailTemplate.find({ isActive: true })
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    EmailTemplate.countDocuments({ isActive: true }),
  ]);
  return paginatedResponse(data, total, page, limit);
};

export const getEmailTemplate = async (templateId: string) => {
  const t = await EmailTemplate.findById(templateId).lean();
  if (!t) throw ApiError.notFound('Template not found');
  return t;
};

export const updateEmailTemplate = async (
  templateId: string,
  data: Partial<{
    name: string;
    description: string;
    subject: string;
    bodyHtml: string;
    variables: string[];
  }>
) => {
  const t = await EmailTemplate.findByIdAndUpdate(templateId, data, {
    new: true,
  });
  if (!t) throw ApiError.notFound('Template not found');
  return t;
};

export const deleteEmailTemplate = async (templateId: string) => {
  await EmailTemplate.findByIdAndUpdate(templateId, { isActive: false });
  return { deleted: true };
};

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL BROADCAST — Resolve recipients
// ─────────────────────────────────────────────────────────────────────────────
const resolveRecipients = async (
  target: string,
  targetSchoolIds?: string[]
): Promise<{ email: string; name: string }[]> => {
  let recipients: { email: string; name: string }[] = [];

  if (
    ['all_schools', 'active_schools', 'trial_schools', 'expired_schools'].includes(
      target
    )
  ) {
    const statusMap: Record<string, string | undefined> = {
      all_schools: undefined,
      active_schools: 'active',
      trial_schools: 'trial',
      expired_schools: 'expired',
    };

    const query: Record<string, unknown> = {};
    const status = statusMap[target];
    if (status) query.subscriptionStatus = status;

    const schools = await School.find(query).select('email name').lean();
    recipients = schools
      .filter((s) => !!s.email)
      .map((s) => ({ email: s.email!, name: s.name }));
  }

  if (target === 'specific_schools' && targetSchoolIds?.length) {
    const schools = await School.find({ _id: { $in: targetSchoolIds } })
      .select('email name')
      .lean();
    recipients = schools
      .filter((s) => !!s.email)
      .map((s) => ({ email: s.email!, name: s.name }));
  }

  if (['all_admins', 'all_teachers', 'all_parents'].includes(target)) {
    const roleMap: Record<string, string> = {
      all_admins: 'schooladmin',
      all_teachers: 'teacher',
      all_parents: 'parent',
    };
    const users = await User.find({
      role: roleMap[target],
      isActive: true,
      email: { $exists: true, $ne: '' },
    })
      .select('email firstName lastName')
      .lean();
    recipients = users.map((u) => ({
      email: u.email!,
      name: `${u.firstName} ${u.lastName}`,
    }));
  }

  return recipients;
};

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL BROADCAST — Replace template variables
// ─────────────────────────────────────────────────────────────────────────────
const replaceVariables = (
  text: string,
  vars: Record<string, string>
): string => {
  let result = text;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), val);
  }
  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL BROADCAST — Send
// ─────────────────────────────────────────────────────────────────────────────
export const sendEmailBroadcast = async (
  actorId: string,
  data: {
    subject: string;
    bodyHtml: string;
    target: string;
    targetSchoolIds?: string[];
    templateId?: string;
  }
) => {
  const recipients = await resolveRecipients(
    data.target,
    data.targetSchoolIds
  );

  if (!recipients.length) {
    throw ApiError.badRequest('No recipients found for the selected target');
  }

  // Create broadcast record
  const broadcast = await EmailBroadcast.create({
    subject: data.subject,
    bodyHtml: data.bodyHtml,
    target: data.target,
    targetSchoolIds: data.targetSchoolIds,
    sentBy: actorId,
    templateId: data.templateId,
    totalRecipients: recipients.length,
    status: 'sending',
    sentAt: new Date(),
  });

  const { html } = broadcastTemplate({
    subject: data.subject,
    bodyHtml: data.bodyHtml,
    senderName: 'EduSync Team',
  });

  let successCount = 0;
  let failCount = 0;

  // Send in batches of 10
  const BATCH_SIZE = 10;
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map(async (r) => {
        const sent = await sendEmail(r.email, data.subject, html);
        if (sent) successCount++;
        else failCount++;
      })
    );
    if (i + BATCH_SIZE < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  await EmailBroadcast.findByIdAndUpdate(broadcast._id, {
    successCount,
    failCount,
    status: 'completed',
  });

  logger.info(
    `📧 Broadcast complete: ${successCount} sent, ${failCount} failed`
  );

  return {
    broadcastId: broadcast._id,
    totalRecipients: recipients.length,
    successCount,
    failCount,
    status: 'completed',
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL BROADCAST — Send from template
// ─────────────────────────────────────────────────────────────────────────────
export const sendBroadcastFromTemplate = async (
  actorId: string,
  data: {
    templateId: string;
    target: string;
    targetSchoolIds?: string[];
    variables?: Record<string, string>;
  }
) => {
  const template = await EmailTemplate.findById(data.templateId);
  if (!template) throw ApiError.notFound('Template not found');

  const vars = data.variables || {};
  const subject = replaceVariables(template.subject, vars);
  const bodyHtml = replaceVariables(template.bodyHtml, vars);

  return sendEmailBroadcast(actorId, {
    subject,
    bodyHtml,
    target: data.target,
    targetSchoolIds: data.targetSchoolIds,
    templateId: data.templateId,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL BROADCAST — History
// ─────────────────────────────────────────────────────────────────────────────
export const getBroadcastHistory = async (page = 1, limit = 20) => {
  const { skip } = getPagination(page, limit);
  const [data, total] = await Promise.all([
    EmailBroadcast.find()
      .populate('sentBy', 'firstName lastName')
      .populate('templateId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    EmailBroadcast.countDocuments(),
  ]);
  return paginatedResponse(data, total, page, limit);
};

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM SETTINGS — Get
// ─────────────────────────────────────────────────────────────────────────────
export const getPlatformSettings = async () => {
  let settings = await PlatformSettings.findOne().lean();
  if (!settings) {
    settings = await PlatformSettings.create({
      platformName: 'EduSync',
      supportEmail: 'support@edusync.ng',
      tagline: 'Nigerian School Management Platform',
      primaryColor: '#1a56db',
    });
  }
  return settings;
};

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM SETTINGS — Update
// ─────────────────────────────────────────────────────────────────────────────
export const updatePlatformSettings = async (
  actorId: string,
  data: Partial<{
    platformName: string;
    supportEmail: string;
    supportPhone: string;
    address: string;
    tagline: string;
    primaryColor: string;
  }>
) => {
  const settings = await PlatformSettings.findOneAndUpdate(
    {},
    { ...data, updatedBy: actorId },
    { new: true, upsert: true }
  );
  return settings;
};

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM LOGO — Upload
// ─────────────────────────────────────────────────────────────────────────────
export const uploadPlatformLogo = async (
  actorId: string,
  fileUrl: string,
  publicId: string
) => {
  let settings = await PlatformSettings.findOne();
  if (!settings) {
    settings = new PlatformSettings({
      platformName: 'EduSync',
      supportEmail: 'support@edusync.ng',
    });
  }

  if (settings.logoPublicId) {
    try {
      await deleteCloudinaryFile(settings.logoPublicId);
    } catch {
      // Non-blocking
    }
  }

  settings.logoUrl = fileUrl;
  settings.logoPublicId = publicId;
  settings.updatedBy = actorId as any;
  await settings.save();

  return { logoUrl: fileUrl };
};

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM LOGO — Remove
// ─────────────────────────────────────────────────────────────────────────────
export const removePlatformLogo = async (actorId: string) => {
  const settings = await PlatformSettings.findOne();
  if (!settings?.logoPublicId) {
    throw ApiError.badRequest('No platform logo to remove');
  }

  try {
    await deleteCloudinaryFile(settings.logoPublicId);
  } catch {
    // Non-blocking
  }

  settings.logoUrl = undefined;
  settings.logoPublicId = undefined;
  settings.updatedBy = actorId as any;
  await settings.save();

  return { removed: true };
};

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM FAVICON — Upload
// ─────────────────────────────────────────────────────────────────────────────
export const uploadPlatformFavicon = async (
  actorId: string,
  fileUrl: string,
  publicId: string
) => {
  let settings = await PlatformSettings.findOne();
  if (!settings) {
    settings = new PlatformSettings({
      platformName: 'EduSync',
      supportEmail: 'support@edusync.ng',
    });
  }

  if (settings.faviconPublicId) {
    try {
      await deleteCloudinaryFile(settings.faviconPublicId);
    } catch {
      // Non-blocking
    }
  }

  settings.faviconUrl = fileUrl;
  settings.faviconPublicId = publicId;
  settings.updatedBy = actorId as any;
  await settings.save();

  return { faviconUrl: fileUrl };
};

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM FAVICON — Remove
// ─────────────────────────────────────────────────────────────────────────────
export const removePlatformFavicon = async (actorId: string) => {
  const settings = await PlatformSettings.findOne();
  if (!settings?.faviconPublicId) {
    throw ApiError.badRequest('No favicon to remove');
  }

  try {
    await deleteCloudinaryFile(settings.faviconPublicId);
  } catch {
    // Non-blocking
  }

  settings.faviconUrl = undefined;
  settings.faviconPublicId = undefined;
  settings.updatedBy = actorId as any;
  await settings.save();

  return { removed: true };
};