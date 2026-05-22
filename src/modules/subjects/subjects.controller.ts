import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess } from '../../shared/utils/ApiResponse';
import * as svc from './subjects.service';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const subject = await svc.createSubject(req.schoolId!, req.branchId!, req.user!.userId, req.body);
  sendSuccess(res, subject, 'Subject created', 201);
});

export const bulkCreate = asyncHandler(async (req: Request, res: Response) => {
  const { classId, names } = req.body;
  const result = await svc.bulkCreateSubjects(req.schoolId!, req.branchId!, req.user!.userId, classId, names);
  sendSuccess(res, result, `${result.created} subjects created`);
});

export const listByClass = asyncHandler(async (req: Request, res: Response) => {
  const classId = Array.isArray(req.params.classId) ? req.params.classId[0] : req.params.classId;
  const subjects = await svc.listSubjectsByClass(req.schoolId!, req.branchId!, classId!);
  sendSuccess(res, subjects);
});

export const listAll = asyncHandler(async (req: Request, res: Response) => {
  const subjects = await svc.listAllSubjects(req.schoolId!, req.branchId!);
  sendSuccess(res, subjects);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const subject = await svc.getSubject(req.schoolId!, req.branchId!, id!);
  sendSuccess(res, subject);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const subject = await svc.updateSubject(
    req.schoolId!, req.branchId!, id!, req.user!.userId, req.body
  );
  sendSuccess(res, subject);
});

export const assignTeacher = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId } = req.body;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const subject = await svc.assignTeacherToSubject(
    req.schoolId!, req.branchId!, id!, teacherId, req.user!.userId
  );
  sendSuccess(res, subject, 'Teacher assigned to subject');
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await svc.deleteSubject(req.schoolId!, req.branchId!, id!, req.user!.userId);
  sendSuccess(res, result, 'Subject deactivated');
});