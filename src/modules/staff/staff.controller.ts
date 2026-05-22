import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess } from '../../shared/utils/ApiResponse';
import { uploadToCloudinary } from '../uploads/upload.middleware';
import * as svc from './staff.service';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.createStaff(
    req.schoolId!, req.branchId!, req.user!.userId, req.body
  );
  sendSuccess(res, result, 'Staff member created', 201);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, staffRole, search, isActive } = req.query as Record<string, string>;
  const result = await svc.listStaff(
    req.schoolId!, req.branchId!, +page || 1, +limit || 20,
    staffRole, search,
    isActive !== undefined ? isActive === 'true' : undefined
  );
  sendSuccess(res, result);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.getStaff(
    req.schoolId!, req.branchId!, String(req.params.id)
  );
  sendSuccess(res, result);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.updateStaff(
    req.schoolId!, req.branchId!, String(req.params.id), req.user!.userId, req.body
  );
  sendSuccess(res, result, 'Staff profile updated');
});

export const uploadPassport = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new Error('No file uploaded');

  const { url, publicId } = await uploadToCloudinary(
    req.file.buffer, 'passports',
    { width: 300, height: 300, crop: 'fill' },
    req.file.mimetype
  );

  const result = await svc.uploadStaffPassport(
    req.schoolId!, req.branchId!, String(req.params.id),
    req.user!.userId, url, publicId
  );
  sendSuccess(res, result, 'Passport uploaded');
});

export const getQRCode = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.getStaffQRCode(
    req.schoolId!, req.branchId!, String(req.params.id)
  );
  sendSuccess(res, result);
});

export const regenerateQR = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.regenerateStaffQR(
    req.schoolId!, req.branchId!, String(req.params.id)
  );
  sendSuccess(res, result, 'QR code regenerated');
});

export const deactivate = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.deactivateStaff(
    req.schoolId!, req.branchId!, String(req.params.id),
    req.user!.userId, req.body.reason
  );
  sendSuccess(res, result, 'Staff member deactivated');
});

export const reactivate = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.reactivateStaff(
    req.schoolId!, req.branchId!, String(req.params.id), req.user!.userId
  );
  sendSuccess(res, result, 'Staff member reactivated');
});