import { Router } from 'express';
import * as ctrl from './schools.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import { tenantGuard } from '../../shared/middlewares/tenantGuard';
import { validate } from '../../shared/middlewares/validate';
import { uploadLimiter } from '../../shared/middlewares/rateLimiter';
import { imageUpload } from '../uploads/upload.middleware';
import { updateSchoolSchema } from './schools.schema';

const router = Router();
router.use(authenticate, tenantGuard);

// ─────────────────────────────────────────────────────────────────────────────
// SCHOOL PROFILE
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', ctrl.getMySchool);
router.get('/stats', authorize('schooladmin'), ctrl.getStats);
router.get('/audit', authorize('schooladmin'), ctrl.getAuditLogs);

router.patch(
  '/',
  authorize('schooladmin'),
  validate(updateSchoolSchema),
  ctrl.updateSchool
);

// ─────────────────────────────────────────────────────────────────────────────
// SCHOOL LOGO
// Upload after registration — logo is NOT part of registration flow
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/logo',
  authorize('schooladmin'),
  uploadLimiter,
  imageUpload.single('logo'),
  ctrl.uploadLogo
);

router.delete(
  '/logo',
  authorize('schooladmin'),
  ctrl.removeLogo
);

// ─────────────────────────────────────────────────────────────────────────────
// PRINCIPAL SIGNATURE
//
// These routes manage the principal's handwritten signature used on:
//   - Student result cards
//   - ID cards
//   - Any generated PDF documents
//
// By default all three endpoints target the MAIN BRANCH.
// To target a specific branch pass ?branchId=<id> as a query param.
//
// Examples:
//   POST /api/schools/principal/signature              → main branch
//   POST /api/schools/principal/signature?branchId=xx → specific branch
//   PATCH /api/schools/principal/name                  → main branch
//   PATCH /api/schools/principal/name?branchId=xx      → specific branch
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/principal/signature',
  authorize('schooladmin'),
  uploadLimiter,
  imageUpload.single('signature'),
  ctrl.uploadPrincipalSignature
);

router.get('/branches/overview', authorize('schooladmin'), ctrl.allBranchesOverview);
router.get('/branches/:branchId/overview', authorize('schooladmin'), ctrl.branchOverview);

router.delete(
  '/principal/signature',
  authorize('schooladmin'),
  ctrl.removePrincipalSignature
);

router.patch(
  '/principal/name',
  authorize('schooladmin'),
  ctrl.updatePrincipalName
);

export default router;