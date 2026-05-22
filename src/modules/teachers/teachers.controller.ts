import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess } from '../../shared/utils/ApiResponse';
import * as svc from './teachers.service';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.createTeacher(
    req.schoolId!,
    req.branchId!,
    req.user!.userId,
    req.body
  );
  sendSuccess(res, result, result.message, 201);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search, isActive } = req.query as Record<string, string>;
  const result = await svc.listTeachers(
    req.schoolId!,
    req.branchId!,
    +page || 1,
    +limit || 20,
    search,
    isActive !== undefined ? isActive === 'true' : undefined
  );
  sendSuccess(res, result);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.getTeacher(
    req.schoolId!,
    req.branchId!,
    String(req.params.id)
  );
  sendSuccess(res, result);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.updateTeacher(
    req.schoolId!,
    req.branchId!,
    String(req.params.id),
    req.user!.userId,
    req.body
  );
  sendSuccess(res, result, 'Teacher profile updated');
});

export const assignClasses = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId, classIds } = req.body;
  const result = await svc.assignTeacherToClasses(
    req.schoolId!,
    req.branchId!,
    req.user!.userId,
    String(teacherId),
    classIds
  );
  sendSuccess(res, result, `${result.assigned} class(es) assigned to teacher`);
});

export const assignSubjects = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId, subjectIds } = req.body;
  const result = await svc.assignTeacherToSubjects(
    req.schoolId!,
    req.branchId!,
    req.user!.userId,
    String(teacherId),
    subjectIds
  );
  sendSuccess(res, result, `${result.assigned} subject(s) assigned to teacher`);
});

export const uploadPassport = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file as any;
  if (!file) throw new Error('No file was uploaded. Please attach a passport photo.');
  const result = await svc.uploadTeacherPassport(
    req.schoolId!,
    req.branchId!,
    String(req.params.id),
    req.user!.userId,
    file.path,
    file.filename
  );
  sendSuccess(res, result, 'Teacher passport uploaded successfully');
});

export const uploadOwnPassport = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file as any;
  if (!file) throw new Error('No file was uploaded. Please attach a passport photo.');
  const result = await svc.uploadOwnPassport(
    req.schoolId!,
    req.branchId!,
    req.user!.userId,
    file.path,
    file.filename
  );
  sendSuccess(res, result, 'Your passport photo has been uploaded successfully');
});

export const removePassport = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.removeTeacherPassport(
    req.schoolId!,
    req.branchId!,
    String(req.params.id),
    req.user!.userId
  );
  sendSuccess(res, result, 'Passport photo removed');
});

export const deactivate = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.deactivateTeacher(
    req.schoolId!,
    req.branchId!,
    String(req.params.id),
    req.user!.userId,
    req.body.reason
  );
  sendSuccess(res, result, 'Teacher deactivated and unassigned from all classes and subjects');
});

export const reactivate = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.reactivateTeacher(
    req.schoolId!,
    req.branchId!,
    String(req.params.id),
    req.user!.userId
  );
  sendSuccess(res, result, 'Teacher reactivated successfully');
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.resetTeacherPassword(
    req.schoolId!,
    req.branchId!,
    String(req.params.id),
    req.user!.userId
  );
  sendSuccess(res, result, result.message);
});