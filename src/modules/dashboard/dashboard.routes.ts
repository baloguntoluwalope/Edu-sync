import { Router } from 'express';
import * as ctrl from './dashboard.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import { tenantGuard } from '../../shared/middlewares/tenantGuard';

const router = Router();
router.use(authenticate, tenantGuard);

router.get('/admin', authorize('schooladmin'), ctrl.adminDashboard);
router.get('/teacher', authorize('teacher'), ctrl.teacherDashboard);
router.get('/student', authorize('student'), ctrl.studentPortal);
router.get('/parent', authorize('parent'), ctrl.parentPortal);

export default router;