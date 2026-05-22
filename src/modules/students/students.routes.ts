import { Router } from 'express';
import * as ctrl from './students.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import { tenantGuard } from '../../shared/middlewares/tenantGuard';
import { validate } from '../../shared/middlewares/validate';
import { uploadLimiter } from '../../shared/middlewares/rateLimiter';
import { imageUpload } from '../uploads/upload.middleware';
import { createStudentSchema, updateStudentSchema } from './students.schema';

const router = Router();
router.use(authenticate, tenantGuard);

// ─── List & read ──────────────────────────────────────────────────────────────
router.get('/', authorize('schooladmin', 'teacher'), ctrl.list);
router.get('/:id', authorize('schooladmin', 'teacher', 'parent', 'student'), ctrl.getOne);

// ─── Create & update ──────────────────────────────────────────────────────────
router.post(
  '/',
  authorize('schooladmin', 'teacher'),
  validate(createStudentSchema),
  ctrl.create
);

router.patch(
  '/:id',
  authorize('schooladmin', 'teacher'),
  validate(updateStudentSchema),
  ctrl.update
);

// ─── Passport (photo) ─────────────────────────────────────────────────────────
router.post(
  '/:id/passport',
  authorize('schooladmin', 'teacher'),
  uploadLimiter,
  imageUpload.single('passport'),
  ctrl.uploadPassport
);

router.delete(
  '/:id/passport',
  authorize('schooladmin'),
  ctrl.removePassport
);

// ─── QR code ──────────────────────────────────────────────────────────────────
router.get(
  '/:id/qrcode',
  authorize('schooladmin', 'teacher'),
  ctrl.regenerateQR
);

// ─── Deactivate ───────────────────────────────────────────────────────────────
router.patch(
  '/:id/deactivate',
  authorize('schooladmin'),
  ctrl.deactivate
);

export default router;