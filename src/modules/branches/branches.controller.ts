import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess } from '../../shared/utils/ApiResponse';
import * as svc from './branches.service';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const branch = await svc.createBranch(req.schoolId!, req.user!.userId, req.body);
  sendSuccess(res, branch, 'Branch created', 201);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const branches = await svc.listBranches(req.schoolId!);
  sendSuccess(res, branches);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const branch = await svc.getBranch(req.schoolId!, req.params.id as string);
  sendSuccess(res, branch);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const branch = await svc.updateBranch(req.schoolId!, req.params.id as string, req.user!.userId, req.body);
  sendSuccess(res, branch);
});

export const uploadLogo = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file as any;
  const branch = await svc.uploadBranchLogo(
    req.schoolId!, req.params.id as string, file.path, file.filename
  );
  sendSuccess(res, branch, 'Branch logo updated');
});

export const uploadSignature = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file as any;
  const branch = await svc.uploadPrincipalSignature(
    req.schoolId!, req.params.id as string, file.path, file.filename
  );
  sendSuccess(res, branch, 'Principal signature updated');
});

export const deactivate = asyncHandler(async (req: Request, res: Response) => {
  const branch = await svc.deactivateBranch(req.schoolId!, req.params.id as string, req.user!.userId);
  sendSuccess(res, branch, 'Branch deactivated');
});