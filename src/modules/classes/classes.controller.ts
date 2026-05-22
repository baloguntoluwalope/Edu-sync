import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess } from '../../shared/utils/ApiResponse';
import * as svc from './classes.service';

export const create = asyncHandler(async (req: Request, res: Response) => {
  // EduSync auto-creates all standard classes (KG1–SS3) on school/branch setup.
  // This is only called when an admin needs a non-standard extra class.
  const cls = await svc.createClass(req.schoolId!, req.branchId!, req.user!.userId, req.body);
  sendSuccess(res, cls, 'Custom class created', 201);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const classes = await svc.listClasses(req.schoolId!, req.branchId!);
  sendSuccess(res, classes);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await svc.getClass(req.schoolId!, req.branchId!, id!);
  sendSuccess(res, result);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const cls = await svc.updateClass(
    req.schoolId!, req.branchId!, id!, req.user!.userId, req.body
  );
  sendSuccess(res, cls);
});

export const addStudents = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await svc.addStudentsToClass(
    req.schoolId!, req.branchId!, id!, req.user!.userId, req.body.studentIds
  );
  sendSuccess(res, result, 'Students added to class');
});

export const removeStudent = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const studentId = Array.isArray(req.params.studentId) ? req.params.studentId[0] : req.params.studentId;
  const result = await svc.removeStudentFromClass(
    req.schoolId!, req.branchId!, id!, req.user!.userId, studentId!
  );
  sendSuccess(res, result, 'Student removed from class');
});

export const getStudents = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as Record<string, string>;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await svc.getClassStudents(
    req.schoolId!, req.branchId!, id!, +page || 1, +limit || 30
  );
  sendSuccess(res, result);
});