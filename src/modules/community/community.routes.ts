import { Router } from 'express';
import * as ctrl from './community.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import { tenantGuard } from '../../shared/middlewares/tenantGuard';
import { validate } from '../../shared/middlewares/validate';
import { createPostSchema, updatePostSchema } from './community.schema';

const router = Router();
router.use(authenticate, tenantGuard);

// Anyone in the school can view posts
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);

// Likes — any authenticated user
router.post('/:id/like', ctrl.likePost);

// Create — teachers, admins, parents can post
router.post(
  '/',
  authorize('schooladmin', 'teacher', 'parent'),
  validate(createPostSchema),
  ctrl.create
);

// Update own post — author or admin
router.patch(
  '/:id',
  authorize('schooladmin', 'teacher', 'parent'),
  validate(updatePostSchema),
  ctrl.update
);

// Moderate & delete — admins and teachers only
router.patch('/:id/moderate', authorize('schooladmin', 'teacher'), ctrl.moderate);
router.delete('/:id', authorize('schooladmin', 'teacher', 'parent'), ctrl.deletePost);

export default router;