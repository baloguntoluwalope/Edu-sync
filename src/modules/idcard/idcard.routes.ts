import { Router } from 'express';
import * as ctrl from './idcard.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import { tenantGuard } from '../../shared/middlewares/tenantGuard';

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
// Browser-friendly download — paste URL in browser, token in query
router.get('/download-browser', ctrl.downloadBrowser);

// ─── Protected ────────────────────────────────────────────────────────────────
router.use(authenticate, tenantGuard);

// Preview one card — free, always works
router.get(
  '/preview',
  authorize('schooladmin', 'teacher'),
  ctrl.previewCard
);

// Create orders — all free, instant
router.post('/order', authorize('schooladmin'), ctrl.createOrder);
router.post('/order/class', authorize('schooladmin'), ctrl.createClassOrder);
router.post(
  '/order/branch-staff',
  authorize('schooladmin'),
  ctrl.createBranchStaffOrder
);

// List and get orders
router.get('/orders', authorize('schooladmin'), ctrl.listOrders);
router.get('/orders/:orderId', authorize('schooladmin'), ctrl.getOrder);

// Download — always free, no payment check
router.get(
  '/orders/:orderId/download',
  authorize('schooladmin', 'teacher'),
  ctrl.downloadCards
);

export default router;