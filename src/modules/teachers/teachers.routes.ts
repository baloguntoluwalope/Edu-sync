import { Router } from 'express';
import * as ctrl from './teachers.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import { tenantGuard } from '../../shared/middlewares/tenantGuard';
import { validate } from '../../shared/middlewares/validate';
import { uploadLimiter } from '../../shared/middlewares/rateLimiter';
import { imageUpload } from '../uploads/upload.middleware';
import {
  createTeacherSchema,
  updateTeacherSchema,
  assignClassSchema,
  assignSubjectSchema,
} from './teachers.schema';

const router = Router();
router.use(authenticate, tenantGuard);

// ─────────────────────────────────────────────────────────────────────────────
// SELF SERVICE — Teacher manages their own profile
// Must come before /:id routes so "me" is not treated as an ID
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/me/passport',
  authorize('teacher'),
  uploadLimiter,
  imageUpload.single('passport'),
  ctrl.uploadOwnPassport
);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — Create & list
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/',
  authorize('schooladmin'),
  validate(createTeacherSchema),
  ctrl.create
);

router.get(
  '/',
  authorize('schooladmin', 'teacher'),
  ctrl.list
);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — Assign classes and subjects
// Must come before /:id routes so /assign/* is not treated as an ID
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/assign/classes',
  authorize('schooladmin'),
  validate(assignClassSchema),
  ctrl.assignClasses
);

router.post(
  '/assign/subjects',
  authorize('schooladmin'),
  validate(assignSubjectSchema),
  ctrl.assignSubjects
);

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE TEACHER — Read, update, actions
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/:id',
  authorize('schooladmin', 'teacher'),
  ctrl.getOne
);

router.patch(
  '/:id',
  authorize('schooladmin'),
  validate(updateTeacherSchema),
  ctrl.update
);

router.patch(
  '/:id/deactivate',
  authorize('schooladmin'),
  ctrl.deactivate
);

router.patch(
  '/:id/reactivate',
  authorize('schooladmin'),
  ctrl.reactivate
);

router.post(
  '/:id/reset-password',
  authorize('schooladmin'),
  ctrl.resetPassword
);

// ─────────────────────────────────────────────────────────────────────────────
// PASSPORT — Admin uploads or removes
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/:id/passport',
  authorize('schooladmin'),
  uploadLimiter,
  imageUpload.single('passport'),
  ctrl.uploadPassport
);

router.delete(
  '/:id/passport',
  authorize('schooladmin'),
  ctrl.removePassport
);

export default router;