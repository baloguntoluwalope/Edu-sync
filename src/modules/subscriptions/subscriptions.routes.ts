import { Router } from 'express';
import * as ctrl from './subscriptions.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import { tenantGuard } from '../../shared/middlewares/tenantGuard';
import { generalLimiter } from '../../shared/middlewares/rateLimiter';

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
// Plans — no auth (frontend landing page can fetch plans)
router.get('/plans', ctrl.getPlans);

// Webhook — must be public for KoraPay to call
router.post('/webhook', ctrl.webhook);

// ─── Protected ────────────────────────────────────────────────────────────────
router.use(authenticate);

// Current status — any logged in user can check
router.get('/current', tenantGuard, ctrl.getCurrentSubscription);

// Initiate payment — admin only
router.post(
  '/initialize',
  tenantGuard,
  authorize('schooladmin'),
  generalLimiter,
  ctrl.initializePayment
);

// Verify payment manually (e.g. after redirect back from checkout)
router.get(
  '/verify/:paymentRef',
  tenantGuard,
  authorize('schooladmin'),
  ctrl.verifyPayment
);

// History
router.get(
  '/history',
  tenantGuard,
  authorize('schooladmin'),
  ctrl.getHistory
);

// Cancel pending
router.post(
  '/cancel',
  tenantGuard,
  authorize('schooladmin'),
  ctrl.cancelPending
);

export default router;