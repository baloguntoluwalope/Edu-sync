import { Router } from 'express';
import * as ctrl from './attendance.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import { tenantGuard } from '../../shared/middlewares/tenantGuard';

const router = Router();
router.use(authenticate, tenantGuard);

// QR scan — online (any authorised user with a scanner)
router.post('/qr-scan', authorize('schooladmin', 'teacher'), ctrl.qrScan);

// Manual attendance — mark multiple people
router.post('/manual', authorize('schooladmin', 'teacher'), ctrl.markManual);

// Sign out — manual sign out for one person
router.post('/sign-out', authorize('schooladmin', 'teacher'), ctrl.signOut);

// Sync offline records
router.post('/sync', authorize('schooladmin', 'teacher'), ctrl.syncOffline);

// Get session for a date
router.get('/session', authorize('schooladmin', 'teacher'), ctrl.getSession);

// Lock session
router.post('/session/lock', authorize('schooladmin'), ctrl.lockSession);

// Summary by date range
router.get('/summary', authorize('schooladmin', 'teacher'), ctrl.summary);

// Individual attendance history
router.get('/:attendeeId/history', ctrl.individual);

export default router;