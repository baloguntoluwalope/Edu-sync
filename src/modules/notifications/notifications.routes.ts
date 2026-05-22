import { Router } from 'express';
import * as ctrl from './notifications.controller';
import { authenticate } from '../../shared/middlewares/authenticate';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.patch('/read-all', ctrl.markRead);

export default router;