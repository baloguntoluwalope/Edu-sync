import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import dayjs from 'dayjs';
import { sendSuccess } from '../../shared/utils/ApiResponse';
import * as svc from './attendance.service';

export const qrScan = asyncHandler(async (req: Request, res: Response) => {
  const { qrData, sessionType } = req.body;
  if (!qrData) throw new Error('QR code data is required');

  const result = await svc.processQRScan(
    req.schoolId!, req.branchId!, req.user!.userId,
    String(qrData), sessionType || 'morning', false
  );
  sendSuccess(res, result, result.message);
});

export const markManual = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.markManualAttendance(
    req.schoolId!, req.branchId!, req.user!.userId, req.body
  );
  sendSuccess(res, result, `${result.marked} record(s) marked`);
});

export const signOut = asyncHandler(async (req: Request, res: Response) => {
  const { attendeeId, date, sessionType } = req.body;
  const signOutDate = date || dayjs().format('YYYY-MM-DD');
  const result = await svc.manualSignOut(
    req.schoolId!, req.branchId!, req.user!.userId,
    String(attendeeId), String(signOutDate), sessionType || 'morning'
  );
  sendSuccess(res, result, result.name + ' signed out');
});

export const syncOffline = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.syncOfflineAttendance(
    req.schoolId!, req.branchId!, req.user!.userId, req.body.records
  );
  sendSuccess(res, result, `${result.synced} record(s) synced`);
});

export const getSession = asyncHandler(async (req: Request, res: Response) => {
  const { date, sessionType } = req.query as Record<string, string>;
  const result = await svc.getSession(
    req.schoolId!, req.branchId!, String(date), sessionType || 'morning'
  );
  sendSuccess(res, result);
});

export const lockSession = asyncHandler(async (req: Request, res: Response) => {
  const { date, sessionType } = req.body;
  const result = await svc.lockSession(
    req.schoolId!, req.branchId!, String(date), String(sessionType), req.user!.userId
  );
  sendSuccess(res, result, 'Session locked');
});

export const summary = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, attendeeType } = req.query as Record<string, string>;
  const result = await svc.getAttendanceSummary(
    req.schoolId!, req.branchId!,
    String(startDate), String(endDate), attendeeType
  );
  sendSuccess(res, result);
});

export const individual = asyncHandler(async (req: Request, res: Response) => {
  const { month, page, limit } = req.query as Record<string, string>;
  const result = await svc.getIndividualAttendance(
    req.schoolId!, req.branchId!,
    String(req.params.attendeeId), month,
    +page || 1, +limit || 30
  );
  sendSuccess(res, result);
});