import { Router } from 'express';
import * as ctrl from './subjects.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import { tenantGuard } from '../../shared/middlewares/tenantGuard';

const router = Router();
router.use(authenticate, tenantGuard);

// ─── Read (teachers and admins) ───────────────────────────────────────────
router.get('/', authorize('schooladmin', 'teacher'), ctrl.listAll);
router.get('/class/:classId', authorize('schooladmin', 'teacher', 'student'), ctrl.listByClass);
router.get('/:id', authorize('schooladmin', 'teacher'), ctrl.getOne);

// ─── Admin-only: add extra subject if defaults are not enough ─────────────
router.post(
  '/',
  authorize('schooladmin'),
  ctrl.create
  // NOTE: EduSync auto-creates default subjects per class on setup.
  // This is ONLY for adding a custom subject e.g. "French", "Computer Science"
);

router.post(
  '/bulk',
  authorize('schooladmin'),
  ctrl.bulkCreate
  // NOTE: Also only for custom/extra subjects. Use this to add multiple at once.
);

// ─── Admin-only: manage existing subjects ─────────────────────────────────
router.patch('/:id', authorize('schooladmin'), ctrl.update);
router.patch('/:id/assign-teacher', authorize('schooladmin'), ctrl.assignTeacher);
router.delete('/:id', authorize('schooladmin'), ctrl.remove);

export default router;