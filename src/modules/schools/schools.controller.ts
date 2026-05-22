import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess } from '../../shared/utils/ApiResponse';
import * as svc from './schools.service';

export const getMySchool = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.getMySchool(req.schoolId!);
  sendSuccess(res, result);
});

export const updateSchool = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.updateSchool(req.schoolId!, req.user!.userId, req.body);
  sendSuccess(res, result, 'School updated successfully');
});

export const uploadLogo = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file as any;
  if (!file) throw new Error('No file uploaded. Please attach an image.');

  const result = await svc.uploadSchoolLogo(
    req.schoolId!,
    req.user!.userId,
    file.path,
    file.filename
  );
  sendSuccess(res, result, 'School logo uploaded successfully');
});

export const removeLogo = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.removeSchoolLogo(req.schoolId!, req.user!.userId);
  sendSuccess(res, result, 'School logo removed');
});

// ─────────────────────────────────────────────────────────────────────────────
// PRINCIPAL SIGNATURE
// branchId is optional in the request body.
// If not provided it defaults to the main branch.
// ─────────────────────────────────────────────────────────────────────────────
export const uploadPrincipalSignature = asyncHandler(
  async (req: Request, res: Response) => {
    const file = req.file as any;
    if (!file) throw new Error('No file uploaded. Please attach the signature image.');

    // branchId can be sent as a query param or form field
    const branchId =
      String(req.query.branchId || req.body.branchId || '').trim() || undefined;

    const result = await svc.uploadPrincipalSignature(
      req.schoolId!,
      req.user!.userId,
      file.path,
      file.filename,
      branchId
    );

    sendSuccess(
      res,
      result,
      `Principal signature uploaded for ${result.branchName}`
    );
  }
);

export const removePrincipalSignature = asyncHandler(
  async (req: Request, res: Response) => {
    const branchId =
      String(req.query.branchId || req.body.branchId || '').trim() || undefined;

    const result = await svc.removePrincipalSignature(
      req.schoolId!,
      req.user!.userId,
      branchId
    );

    sendSuccess(res, result, 'Principal signature removed');
  }
);

export const updatePrincipalName = asyncHandler(
  async (req: Request, res: Response) => {
    const { principalName, branchId } = req.body;

    if (!principalName || !String(principalName).trim()) {
      throw new Error('Principal name is required');
    }

    const result = await svc.updatePrincipalName(
      req.schoolId!,
      req.user!.userId,
      String(principalName),
      branchId ? String(branchId) : undefined
    );

    sendSuccess(res, result, `Principal name updated for ${result.branchName}`);
  }
);

export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.getSchoolStats(req.schoolId!);
  sendSuccess(res, result);
});

export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, action } = req.query as Record<string, string>;
  const result = await svc.getSchoolAuditLogs(
    req.schoolId!,
    +page || 1,
    +limit || 30,
    action
  );
  sendSuccess(res, result);
});


export const branchOverview = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.getBranchOverview(req.schoolId!, String(req.params.branchId));
  sendSuccess(res, result);
});

export const allBranchesOverview = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.getAllBranchesOverview(req.schoolId!);
  sendSuccess(res, result);
});