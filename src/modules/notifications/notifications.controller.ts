import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess } from '../../shared/utils/ApiResponse';
import * as svc from './notification.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as Record<string, string>;
  const result = await svc.getMyNotifications(req.user!.userId, req.schoolId!, +page || 1, +limit || 20);
  sendSuccess(res, result);
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  await svc.markAllRead(req.user!.userId, req.schoolId!);
  sendSuccess(res, null, 'All notifications marked as read');
});