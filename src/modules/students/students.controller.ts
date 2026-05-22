import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess } from '../../shared/utils/ApiResponse';
import * as svc from './students.service';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.createStudent(
    req.schoolId!, req.branchId!, req.user!.userId, req.body
  );
  sendSuccess(res, result, 'Student enrolled successfully', 201);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, classId, search, gender } = req.query as Record<string, string>;
  const result = await svc.listStudents(
    req.schoolId!, req.branchId!, +page || 1, +limit || 20, classId, search, gender
  );
  sendSuccess(res, result);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id!;
  const result = await svc.getStudent(req.schoolId!, req.branchId!, id);
  sendSuccess(res, result);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id!;
  const result = await svc.updateStudent(
    req.schoolId!, req.branchId!, id, req.user!.userId, req.body
  );
  sendSuccess(res, result, 'Student profile updated');
});

export const uploadPassport = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file as any;
  if (!file) throw new Error('No file uploaded');
  const result = await svc.uploadPassport(
    req.schoolId!, req.branchId!, Array.isArray(req.params.id) ? req.params.id[0] : req.params.id!,
    req.user!.userId, file.path, file.filename
  );
  sendSuccess(res, result, 'Passport uploaded successfully');
});

export const removePassport = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id!;
  const result = await svc.removePassport(
    req.schoolId!, req.branchId!, id, req.user!.userId
  );
  sendSuccess(res, result, 'Passport removed');
});

export const regenerateQR = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id!;
  const result = await svc.regenerateQRCode(
    req.schoolId!, req.branchId!, id
  );
  sendSuccess(res, result);
});

export const deactivate = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id!;
  const result = await svc.deactivateStudent(
    req.schoolId!, req.branchId!, id, req.user!.userId, req.body.reason
  );
  sendSuccess(res, result, 'Student deactivated');
});