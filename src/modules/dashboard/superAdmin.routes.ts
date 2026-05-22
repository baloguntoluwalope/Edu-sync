import { Router } from 'express';
import * as ctrl from './superAdmin.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import { validate } from '../../shared/middlewares/validate';
import { uploadLimiter } from '../../shared/middlewares/rateLimiter';
import { imageUpload } from '../uploads/upload.middleware';
import { z } from 'zod';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { IDCardSettings } from '../../shared/models/IDCardSettings';
// import * as idCardSvc from '../idcard/idcard.service';
// import { svc, setPlatformPrice } from '../idcard/idcard.service';

const router = Router();

// Every route here requires superadmin role
router.use(authenticate, authorize('superadmin'));

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW & ACTIVITY
// ─────────────────────────────────────────────────────────────────────────────
router.get('/overview', ctrl.platformOverview);
router.get('/activity', ctrl.activityFeed);
router.get('/health', ctrl.systemHealth);
router.get('/expiring', ctrl.expiringSchools);

// ─────────────────────────────────────────────────────────────────────────────
// SCHOOLS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/schools', ctrl.allSchools);
router.get('/schools/:schoolId', ctrl.schoolDetail);
router.patch('/schools/:schoolId/suspend', ctrl.suspendSchool);
router.patch('/schools/:schoolId/activate', ctrl.activateSchool);
router.patch('/schools/:schoolId/extend-trial', ctrl.extendTrial);
router.post('/schools/:schoolId/manual-pay', ctrl.manualPay);

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTIONS & REVENUE
// ─────────────────────────────────────────────────────────────────────────────
router.get('/subscriptions', ctrl.allSubscriptions);
router.get('/revenue', ctrl.revenueAnalytics);

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/users', ctrl.allUsers);

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOGS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/audit', ctrl.auditLogs);

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────
const createTemplateSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  subject: z.string().min(3).max(200),
  bodyHtml: z.string().min(10),
  variables: z.array(z.string()).optional().default([]),
});

const sendBroadcastSchema = z.object({
  subject: z.string().min(3).max(200),
  bodyHtml: z.string().min(10),
  target: z.enum([
    'all_schools',
    'active_schools',
    'trial_schools',
    'expired_schools',
    'specific_schools',
    'all_admins',
    'all_teachers',
    'all_parents',
  ]),
  targetSchoolIds: z.array(z.string().length(24)).optional(),
  templateId: z.string().length(24).optional(),
});

const sendFromTemplateSchema = z.object({
  templateId: z.string().length(24),
  target: z.enum([
    'all_schools',
    'active_schools',
    'trial_schools',
    'expired_schools',
    'specific_schools',
    'all_admins',
    'all_teachers',
    'all_parents',
  ]),
  targetSchoolIds: z.array(z.string().length(24)).optional(),
  variables: z.record(z.string(), z.string()).optional(),
});

router.post(
  '/email/templates',
  validate(createTemplateSchema),
  ctrl.createEmailTemplate
);
router.get('/email/templates', ctrl.listEmailTemplates);
router.get('/email/templates/:id', ctrl.getEmailTemplate);
router.patch(
  '/email/templates/:id',
  validate(createTemplateSchema.partial()),
  ctrl.updateEmailTemplate
);
router.delete('/email/templates/:id', ctrl.deleteEmailTemplate);

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL BROADCASTS
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/email/broadcast',
  validate(sendBroadcastSchema),
  ctrl.sendBroadcast
);
router.post(
  '/email/broadcast/from-template',
  validate(sendFromTemplateSchema),
  ctrl.sendBroadcastFromTemplate
);
router.get('/email/broadcasts', ctrl.broadcastHistory);

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
const updateSettingsSchema = z.object({
  platformName: z.string().min(2).max(50).optional(),
  supportEmail: z.string().email().optional(),
  supportPhone: z.string().max(15).optional(),
  address: z.string().max(200).optional(),
  tagline: z.string().max(100).optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color e.g. #1a56db')
    .optional(),
});

router.get('/platform/settings', ctrl.getPlatformSettings);
router.patch(
  '/platform/settings',
  validate(updateSettingsSchema),
  ctrl.updatePlatformSettings
);


// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM ID CARD SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

// router.get('/idcard/settings', asyncHandler(async (req, res) => {
//   // Use the logic already present in the service for consistency
//   const settings = await IDCardSettings.findOne({ isPlatformDefault: true }).lean()
//     || { pricePerCard: 0, isFree: true, isPlatformDefault: true };
    
//   res.json({ success: true, data: settings });
// }));

// router.patch('/idcard/settings', asyncHandler(async (req, res) => {
//   // 2. Use the imported function directly (Fixes TS2339)
//   const result = await setPlatformPrice(req.user!.userId, req.body);
  
//   res.json({ 
//     success: true, 
//     data: result, 
//     message: 'Platform ID card price updated' 
//   });
// }));

// EduSync Platform Logo
router.post(
  '/platform/logo',
  uploadLimiter,
  imageUpload.single('logo'),
  ctrl.uploadPlatformLogo
);
router.delete('/platform/logo', ctrl.removePlatformLogo);

// EduSync Favicon
router.post(
  '/platform/favicon',
  uploadLimiter,
  imageUpload.single('favicon'),
  ctrl.uploadPlatformFavicon
);
router.delete('/platform/favicon', ctrl.removePlatformFavicon);

export default router;