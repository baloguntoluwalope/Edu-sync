import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess } from '../../shared/utils/ApiResponse';
import * as svc from './dashboard.service';

export const adminDashboard = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.getAdminDashboard(req.schoolId!, req.branchId!);
  sendSuccess(res, result);
});

export const teacherDashboard = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.getTeacherDashboard(req.schoolId!, req.branchId!, req.user!.userId);
  sendSuccess(res, result);
});

export const studentPortal = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.getStudentPortal(req.schoolId!, req.branchId!, req.user!.userId);
  sendSuccess(res, result);
});

export const parentPortal = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.getParentPortal(req.schoolId!, req.branchId!, req.user!.userId);
  sendSuccess(res, result);
});