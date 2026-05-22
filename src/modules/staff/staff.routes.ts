import { Router } from 'express';
import * as ctrl from './staff.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import { tenantGuard } from '../../shared/middlewares/tenantGuard';
import { validate } from '../../shared/middlewares/validate';
import { uploadLimiter } from '../../shared/middlewares/rateLimiter';
import { imageUpload } from '../uploads/upload.middleware';
import { createStaffSchema, updateStaffSchema } from './staff.schema';

const router = Router();
router.use(authenticate, tenantGuard);

router.post('/', authorize('schooladmin'), validate(createStaffSchema), ctrl.create);
router.get('/', authorize('schooladmin', 'teacher'), ctrl.list);
router.get('/:id', authorize('schooladmin', 'teacher'), ctrl.getOne);
router.patch('/:id', authorize('schooladmin'), validate(updateStaffSchema), ctrl.update);
router.post('/:id/passport', authorize('schooladmin'), uploadLimiter, imageUpload.single('passport'), ctrl.uploadPassport);
router.get('/:id/qrcode', authorize('schooladmin'), ctrl.getQRCode);
router.post('/:id/qrcode/regenerate', authorize('schooladmin'), ctrl.regenerateQR);
router.patch('/:id/deactivate', authorize('schooladmin'), ctrl.deactivate);
router.patch('/:id/reactivate', authorize('schooladmin'), ctrl.reactivate);

export default router;