import axios from 'axios';
import crypto from 'crypto';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { Subscription } from '../../shared/models/Subscription';
import { School } from '../../shared/models/School';
import { User } from '../../shared/models/User';
import { ApiError } from '../../shared/utils/ApiError';
import { env } from '../../config/env';
import { logAudit } from '../../shared/utils/auditLogger';
import { sendEmail, subscriptionTemplate } from '../../shared/utils/emailTemplates';
import { getPagination, paginatedResponse } from '../../shared/utils/pagination';
import { logger } from '../../config/logger';

// ─────────────────────────────────────────────────────────────────────────────
// PLAN DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
export const SUBSCRIPTION_PLANS = {
  monthly: {
    label: 'Monthly Plan',
    amountNaira: 5000,
    durationDays: 30,
    description: 'Billed every 30 days',
  },
  termly: {
    label: 'Termly Plan',
    amountNaira: 12000,
    durationDays: 120,
    description: 'Billed every school term (approx. 4 months)',
  },
  annual: {
    label: 'Annual Plan',
    amountNaira: 40000,
    durationDays: 365,
    description: 'Best value — billed once per year',
  },
} as const;

export type PlanKey = keyof typeof SUBSCRIPTION_PLANS;

// ─────────────────────────────────────────────────────────────────────────────
// GET PLAN LIST — for frontend display
// ─────────────────────────────────────────────────────────────────────────────
export const getPlans = () => {
  return Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
    key,
    ...plan,
    savingsPercent:
      key === 'annual'
        ? Math.round(
            ((SUBSCRIPTION_PLANS.monthly.amountNaira * 12 -
              SUBSCRIPTION_PLANS.annual.amountNaira) /
              (SUBSCRIPTION_PLANS.monthly.amountNaira * 12)) *
              100
          )
        : undefined,
  }));
};

// ─────────────────────────────────────────────────────────────────────────────
// GET CURRENT SUBSCRIPTION — What is active right now
// ─────────────────────────────────────────────────────────────────────────────
export const getCurrentSubscription = async (schoolId: string) => {
  const school = await School.findById(schoolId)
    .select('name subscriptionStatus trialEndsAt subscriptionEndsAt')
    .lean();
  if (!school) throw ApiError.notFound('School not found');

  const activeSub = await Subscription.findOne({ schoolId, status: 'paid' })
    .sort({ expiresAt: -1 })
    .lean();

  const now = dayjs();
  let daysLeft: number | null = null;
  let isExpired = false;

  if (school.subscriptionStatus === 'trial') {
    daysLeft = dayjs(school.trialEndsAt).diff(now, 'day');
    isExpired = daysLeft < 0;
  } else if (school.subscriptionStatus === 'active' && school.subscriptionEndsAt) {
    daysLeft = dayjs(school.subscriptionEndsAt).diff(now, 'day');
    isExpired = daysLeft < 0;
  }

  return {
    school: {
      name: school.name,
      subscriptionStatus: school.subscriptionStatus,
      trialEndsAt: school.trialEndsAt,
      subscriptionEndsAt: school.subscriptionEndsAt,
    },
    activeSubscription: activeSub || null,
    daysLeft: Math.max(0, daysLeft ?? 0),
    isExpired,
    plans: getPlans(),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZE PAYMENT — Creates pending subscription + returns checkout URL
// ─────────────────────────────────────────────────────────────────────────────
export const initializePayment = async (
  schoolId: string,
  actorId: string,
  plan: PlanKey
) => {
  const planData = SUBSCRIPTION_PLANS[plan];
  if (!planData) {
    throw ApiError.badRequest(
      `Invalid plan. Choose from: ${Object.keys(SUBSCRIPTION_PLANS).join(', ')}`
    );
  }

  const school = await School.findById(schoolId)
    .select('name email phone')
    .lean();
  if (!school) throw ApiError.notFound('School not found');

  // KoraPay requires a valid email
  if (!school.email) {
    throw ApiError.badRequest(
      'School email is required for payment. Please update your school profile first.'
    );
  }

  const paymentRef = `SUB-${uuidv4().slice(0, 8).toUpperCase()}`;

  const subscription = await Subscription.create({
    schoolId,
    plan,
    amountNaira: planData.amountNaira,
    paymentRef,
    status: 'pending',
    initiatedBy: actorId,
    provider: 'korapay',
    auditLog: [
      {
        action: 'PAYMENT_INITIATED',
        by: actorId,
        at: new Date(),
      },
    ],
  });

  // ─── Build KoraPay request body — only include fields that have values ───
 // ─── Build KoraPay request body ───
const koraPayload: Record<string, any> = {
  reference: paymentRef,
  amount: planData.amountNaira,
  currency: 'NGN',
  customer: {
    email: school.email.toLowerCase().trim(),
    name: school.name.replace(/[^\w\s]/gi, '').trim() || 'School Admin',
  },
  // We keep metadata so we can track the school/plan in our webhook later
  metadata: {
    schoolId: schoolId.toString(),
    plan,
    subscriptionId: (subscription._id as any).toString(),
    planLabel: planData.label,
  },
};

// 1. COMPLETELY REMOVE the customer_phone logic for now
// KoraPay will collect the phone number on their own secure checkout page if needed.

// 2. Add notification URL only if available
const isProduction = env.NODE_ENV === 'production';
if (isProduction || (env.APP_URL && !env.APP_URL.includes('localhost'))) {
  koraPayload.notification_url = `${env.APP_URL}/api/v1/subscriptions/webhook`;
}

  logger.info(`KoraPay initialize payload: ${JSON.stringify(koraPayload)}`);

  try {
    const { data } = await axios.post(
      'https://api.korapay.com/merchant/api/v1/charges/initialize',
      koraPayload,
      {
        headers: {
          Authorization: `Bearer ${env.KORAPAY_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    await logAudit({
      schoolId,
      actorId,
      action: 'SUBSCRIPTION_PAYMENT_INITIATED',
      entity: 'Subscription',
      entityId: (subscription._id as any).toString(),
      metadata: { plan, amount: planData.amountNaira, paymentRef },
    });

    return {
      subscriptionId: subscription._id,
      paymentRef,
      plan,
      planLabel: planData.label,
      amountNaira: planData.amountNaira,
      durationDays: planData.durationDays,
      checkoutUrl: data.data.checkout_url,
      message: `Redirecting to payment — ₦${planData.amountNaira.toLocaleString()} for ${planData.label}`,
    };
  } catch (err: any) {
    // Mark subscription as failed
    await Subscription.findByIdAndUpdate(subscription._id, {
      status: 'failed',
    });

    const koraError =
      err?.response?.data?.message ||
      err?.response?.data?.data?.message ||
      err?.message ||
      'Unknown error';

    logger.error(`KoraPay Response Error: ${koraError}`);
    logger.error(`KoraPay Status: ${err?.response?.status}`);
    logger.error(`KoraPay Body: ${JSON.stringify(err?.response?.data)}`);

    throw new ApiError(502, koraError);
  }
};
// ─────────────────────────────────────────────────────────────────────────────
// HANDLE WEBHOOK — Called by KoraPay on payment event
// ─────────────────────────────────────────────────────────────────────────────
export const handleWebhook = async (rawBody: string, signature: string) => {
  // Verify HMAC signature
  const hash = crypto
    .createHmac('sha256', env.KORAPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  if (hash !== signature) {
    throw ApiError.unauthorized('Invalid webhook signature');
  }

  const payload = JSON.parse(rawBody);
  const { reference, status } = payload.data || {};

  if (!reference) {
    logger.warn('Webhook received with no reference');
    return;
  }

  const subscription = await Subscription.findOne({ paymentRef: reference });
  if (!subscription) {
    logger.warn(`Webhook: no subscription found for ref ${reference}`);
    return;
  }

  // Avoid processing already-handled webhooks
  if (subscription.status === 'paid') {
    logger.info(`Webhook: subscription ${reference} already paid — skipping`);
    return;
  }

  if (status === 'success') {
    const planData = SUBSCRIPTION_PLANS[subscription.plan as PlanKey];
    const expiresAt = dayjs().add(planData.durationDays, 'day').toDate();

    subscription.status = 'paid';
    subscription.paidAt = new Date();
    subscription.expiresAt = expiresAt;
    subscription.auditLog.push({
      action: 'PAYMENT_SUCCESS',
      at: new Date(),
      metadata: { reference, status },
    } as any);
    await subscription.save();

    // Update school subscription status
    await School.findByIdAndUpdate(subscription.schoolId, {
      subscriptionStatus: 'active',
      subscriptionEndsAt: expiresAt,
      isActive: true,
    });

    // Send confirmation email to school admin
    await sendConfirmationEmail(
      (subscription.schoolId as any).toString(),
      subscription
    );

    await logAudit({
      schoolId: (subscription.schoolId as any).toString(),
      action: 'SUBSCRIPTION_PAYMENT_SUCCESS',
      entity: 'Subscription',
      entityId: (subscription._id as any).toString(),
      metadata: {
        plan: subscription.plan,
        amountNaira: subscription.amountNaira,
        expiresAt,
        reference,
      },
    });

    logger.info(`✅ Subscription paid: ${reference} — ${subscription.plan} for school ${subscription.schoolId}`);
  } else if (status === 'failed') {
    subscription.status = 'failed';
    subscription.auditLog.push({
      action: 'PAYMENT_FAILED',
      at: new Date(),
      metadata: { reference, status },
    } as any);
    await subscription.save();

    await logAudit({
      schoolId: (subscription.schoolId as any).toString(),
      action: 'SUBSCRIPTION_PAYMENT_FAILED',
      entity: 'Subscription',
      entityId: (subscription._id as any).toString(),
      metadata: { reference },
    });

    logger.warn(`❌ Subscription payment failed: ${reference}`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SEND CONFIRMATION EMAIL — After successful payment
// ─────────────────────────────────────────────────────────────────────────────
const sendConfirmationEmail = async (
  schoolId: string,
  subscription: any
) => {
  try {
    const [admin, school] = await Promise.all([
      User.findOne({ schoolId, role: 'schooladmin', isActive: true })
        .select('firstName lastName email')
        .lean(),
      School.findById(schoolId).select('name logoUrl').lean(),
    ]);

    if (!admin?.email) return;

    const planData = SUBSCRIPTION_PLANS[subscription.plan as PlanKey];

    const { subject, html } = subscriptionTemplate({
      adminName: `${admin.firstName} ${admin.lastName}`,
      schoolName: school?.name || 'Your School',
      plan: planData.label,
      amountNaira: subscription.amountNaira,
      expiresAt: dayjs(subscription.expiresAt).format('DD MMMM YYYY'),
      paymentRef: subscription.paymentRef,
      logoUrl: (school as any)?.logoUrl,
    });

    await sendEmail(admin.email, subject, html);
  } catch (err) {
    logger.error('Failed to send subscription confirmation email:', err);
    // Non-blocking
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY PAYMENT — Manually verify a pending payment
// ─────────────────────────────────────────────────────────────────────────────
export const verifyPayment = async (paymentRef: string) => {
  const subscription = await Subscription.findOne({ paymentRef });
  if (!subscription) throw ApiError.notFound('Subscription not found');

  if (subscription.status === 'paid') {
    return {
      status: 'paid',
      subscription,
      message: 'Payment already confirmed',
    };
  }

  // Verify with KoraPay
  try {
    const { data } = await axios.get(
      `https://api.korapay.com/merchant/api/v1/charges/${paymentRef}`,
      { headers: { Authorization: `Bearer ${env.KORAPAY_SECRET_KEY}` } }
    );

    const koraStatus = data.data?.status;

    if (koraStatus === 'success') {
      // Process same as webhook
      await handleWebhook(
        JSON.stringify({ data: { reference: paymentRef, status: 'success' } }),
        crypto
          .createHmac('sha256', env.KORAPAY_WEBHOOK_SECRET)
          .update(JSON.stringify({ data: { reference: paymentRef, status: 'success' } }))
          .digest('hex')
      );

      const updated = await Subscription.findOne({ paymentRef }).lean();
      return { status: 'paid', subscription: updated, message: 'Payment verified and activated' };
    }

    return {
      status: koraStatus || subscription.status,
      subscription,
      message: `Payment status: ${koraStatus}`,
    };
  } catch (err: any) {
    logger.error('KoraPay verify error:', err?.response?.data || err.message);
    throw new ApiError(502, 'Could not verify payment. Please contact support.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET SUBSCRIPTION HISTORY
// ─────────────────────────────────────────────────────────────────────────────
export const getHistory = async (
  schoolId: string,
  page = 1,
  limit = 10
) => {
  const { skip } = getPagination(page, limit);

  const [data, total] = await Promise.all([
    Subscription.find({ schoolId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Subscription.countDocuments({ schoolId }),
  ]);

  return paginatedResponse(data, total, page, limit);
};

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL PENDING — Cancel a pending payment
// ─────────────────────────────────────────────────────────────────────────────
export const cancelPending = async (
  schoolId: string,
  paymentRef: string,
  actorId: string
) => {
  const subscription = await Subscription.findOne({
    paymentRef,
    schoolId,
    status: 'pending',
  });
  if (!subscription) {
    throw ApiError.notFound('Pending subscription not found');
  }

  subscription.status = 'failed';
  subscription.auditLog.push({
    action: 'CANCELLED_BY_USER',
    by: actorId as any,
    at: new Date(),
  } as any);
  await subscription.save();

  await logAudit({
    schoolId, actorId,
    action: 'SUBSCRIPTION_CANCELLED',
    entity: 'Subscription',
    entityId: (subscription._id as any).toString(),
    metadata: { paymentRef },
  });

  return { cancelled: true, message: 'Pending subscription cancelled' };
};

// ─────────────────────────────────────────────────────────────────────────────
// SUPERADMIN — Manual activation (offline payment / bank transfer)
// ─────────────────────────────────────────────────────────────────────────────
export const manualActivate = async (
  schoolId: string,
  actorId: string,
  plan: PlanKey,
  reference?: string
) => {
  const planData = SUBSCRIPTION_PLANS[plan];
  if (!planData) throw ApiError.badRequest('Invalid plan');

  const school = await School.findById(schoolId).lean();
  if (!school) throw ApiError.notFound('School not found');

  const paymentRef = reference || `MANUAL-${uuidv4().slice(0, 8).toUpperCase()}`;
  const expiresAt = dayjs().add(planData.durationDays, 'day').toDate();

  const subscription = await Subscription.create({
    schoolId,
    plan,
    amountNaira: planData.amountNaira,
    paymentRef,
    status: 'paid',
    paidAt: new Date(),
    expiresAt,
    provider: 'manual',
    initiatedBy: actorId,
    auditLog: [
      {
        action: 'MANUAL_ACTIVATION_BY_SUPERADMIN',
        by: actorId,
        at: new Date(),
        metadata: { plan, expiresAt, reference: paymentRef },
      },
    ],
  });

  await School.findByIdAndUpdate(schoolId, {
    subscriptionStatus: 'active',
    subscriptionEndsAt: expiresAt,
    isActive: true,
  });

  await sendConfirmationEmail(schoolId, subscription);

  await logAudit({
    schoolId, actorId,
    action: 'SUBSCRIPTION_MANUAL_ACTIVATED',
    entity: 'Subscription',
    entityId: (subscription._id as any).toString(),
    metadata: { plan, expiresAt, reference: paymentRef },
  });

  return {
    subscription,
    expiresAt,
    message: `School subscription manually activated — ${planData.label} until ${dayjs(expiresAt).format('DD MMM YYYY')}`,
  };
};