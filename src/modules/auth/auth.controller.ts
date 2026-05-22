import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess } from '../../shared/utils/ApiResponse';
import * as authService from './auth.service';

export const registerSchool = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.registerSchool(req.body);
  sendSuccess(res, result, result.message, 201);
});

export const loginEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.loginEmailPassword(email, password);
  sendSuccess(res, result, result.message);
});

export const loginStudent = asyncHandler(async (req: Request, res: Response) => {
  const { schoolId, branchId, admissionNumber, lastName } = req.body;
  const result = await authService.loginStudent(
    String(schoolId),
    String(branchId),
    String(admissionNumber),
    String(lastName)
  );
  sendSuccess(res, result, result.message);
});

export const loginParent = asyncHandler(async (req: Request, res: Response) => {
  const { schoolId, branchId, phone, surname } = req.body;
  const result = await authService.loginParent(
    String(schoolId),
    String(branchId),
    String(phone),
    String(surname)
  );
  sendSuccess(res, result, result.message);
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.getMe(req.user!.userId);
  sendSuccess(res, result);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.headers.authorization!.split(' ')[1];
  await authService.logout(token);
  sendSuccess(res, null, 'Logged out successfully');
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const result = await authService.changePassword(
    req.user!.userId,
    String(currentPassword),
    String(newPassword)
  );
  sendSuccess(res, result, result.message);
});

export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  const result = await authService.verifyEmailOTP(String(email), String(otp));
  sendSuccess(res, result, result.message);
});

export const resendOTP = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const result = await authService.resendVerificationOTP(String(email));
  sendSuccess(res, result, result.message);
});