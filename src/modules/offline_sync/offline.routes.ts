import { Router } from 'express';
import { authenticate } from '../../shared/middlewares/authenticate';
import { tenantGuard } from '../../shared/middlewares/tenantGuard';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess } from '../../shared/utils/ApiResponse';
import { syncOfflineAttendance as syncAttendance } from '../attendance/attendance.service';
import { syncOfflineCBT } from '../cbt/cbt.service';

const router = Router();
router.use(authenticate, tenantGuard);

router.post('/attendance', asyncHandler(async (req, res) => {
  const result = await syncAttendance(req.schoolId!, req.branchId!, req.user!.userId, req.body.records);
  sendSuccess(res, result, 'Attendance synced');
}));

router.post('/cbt', asyncHandler(async (req, res) => {
  const result = await syncOfflineCBT(req.schoolId!, req.branchId!, req.body.submissions);
  sendSuccess(res, result, 'CBT submissions synced');
}));

export default router;