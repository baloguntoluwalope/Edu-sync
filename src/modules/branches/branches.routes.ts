import { Router } from 'express';
import * as ctrl from './branches.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import { tenantGuard } from '../../shared/middlewares/tenantGuard';
import { validate } from '../../shared/middlewares/validate';
import { uploadLimiter } from '../../shared/middlewares/rateLimiter';
import { createBranchSchema, updateBranchSchema } from './branches.schema';
import { imageUpload } from '../uploads/upload.middleware';

const router = Router();
router.use(authenticate, tenantGuard, authorize('schooladmin'));

router.post('/', validate(createBranchSchema), ctrl.create);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.patch('/:id', validate(updateBranchSchema), ctrl.update);
router.post('/:id/logo', uploadLimiter, imageUpload.single('logo'), ctrl.uploadLogo);
router.post('/:id/signature', uploadLimiter, imageUpload.single('signature'), ctrl.uploadSignature);
router.patch('/:id/deactivate', ctrl.deactivate);

export default router;