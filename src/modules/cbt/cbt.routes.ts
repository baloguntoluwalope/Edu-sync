import { Router } from 'express';
import * as ctrl from './cbt.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import { tenantGuard } from '../../shared/middlewares/tenantGuard';
import { documentUpload } from '../uploads/upload.middleware';

const router = Router();
router.use(authenticate, tenantGuard);

router.post(
  '/:id/upload-questions',
  authorize('teacher', 'schooladmin'),
  documentUpload.single('questions'),
  ctrl.uploadQuestionsFile
);
router.post('/', authorize('teacher', 'schooladmin'), ctrl.create);
router.patch('/:id/publish', authorize('teacher', 'schooladmin'), ctrl.publish);
router.get('/:id/take', authorize('student'), ctrl.take);
router.get('/:id/results', authorize('teacher', 'schooladmin'), ctrl.results);
router.post('/submit', authorize('student'), ctrl.submit);
router.post('/sync', authorize('student'), ctrl.syncOffline);
router.get('/active', authorize('student', 'teacher', 'schooladmin'), ctrl.activeExams);
export default router;