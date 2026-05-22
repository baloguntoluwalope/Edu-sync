import { Router } from 'express';
import * as ctrl from './classes.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import { tenantGuard } from '../../shared/middlewares/tenantGuard';

const router = Router();
router.use(authenticate, tenantGuard);

// ─── Read (all roles can view their branch classes) ───────────────────────
router.get('/', authorize('schooladmin', 'teacher'), ctrl.list);
router.get('/:id', authorize('schooladmin', 'teacher'), ctrl.getOne);
router.get('/:id/students', authorize('schooladmin', 'teacher'), ctrl.getStudents);

// ─── Admin-only: add extra class if the default set is not enough ─────────
router.post(
  '/',
  authorize('schooladmin'),
  ctrl.create
  // NOTE: EduSync auto-creates KG1–SS3 on registration.
  // This endpoint is ONLY for adding a custom class e.g. "Pre-KG" or "Extra Studies"
);

// ─── Admin-only: manage existing classes ──────────────────────────────────
router.patch('/:id', authorize('schooladmin'), ctrl.update);
router.post('/:id/students', authorize('schooladmin', 'teacher'), ctrl.addStudents);
router.delete('/:id/students/:studentId', authorize('schooladmin', 'teacher'), ctrl.removeStudent);

export default router;