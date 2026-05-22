import { Router } from 'express';
import * as ctrl from './auth.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authLimiter } from '../../shared/middlewares/rateLimiter';
import { validate } from '../../shared/middlewares/validate';
import {
  registerSchoolSchema,
  loginEmailSchema,
  loginStudentSchema,
  loginParentSchema,
} from './auth.schema';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// School admin registration
router.post(
  '/register',
  authLimiter,
  validate(registerSchoolSchema),
  ctrl.registerSchool
);

// Email + password login
// Used by: schooladmin, teacher, superadmin
router.post(
  '/login',
  authLimiter,
  validate(loginEmailSchema),
  ctrl.loginEmail
);

// Student portal login (admissionNumber + lastName)
router.post(
  '/login/student',
  authLimiter,
  validate(loginStudentSchema),
  ctrl.loginStudent
);

// Parent portal login (phone + surname)
router.post(
  '/login/parent',
  authLimiter,
  validate(loginParentSchema),
  ctrl.loginParent
);

// Email verification
router.post('/verify-email', authLimiter, ctrl.verifyOTP);
router.post('/resend-otp', authLimiter, ctrl.resendOTP);

// ─────────────────────────────────────────────────────────────────────────────
// PROTECTED ROUTES
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', authenticate, ctrl.getMe);
router.post('/logout', authenticate, ctrl.logout);
router.post('/change-password', authenticate, ctrl.changePassword);

export default router;