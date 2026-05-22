import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess } from '../../shared/utils/ApiResponse';
import * as svc from './cbt.service';
import { documentUpload } from '../uploads/upload.middleware';


export const uploadQuestionsFile = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.file) {
      throw new Error('No file uploaded. Please attach a PDF or DOCX file.');
    }

    const result = await svc.uploadQuestionsFromFile(
      req.schoolId!,
      req.branchId!,
      req.user!.userId,
      String(req.params.id),
      req.file.buffer,
      req.file.mimetype,
      {
        marksPerQuestion: req.body.marksPerQuestion
          ? +req.body.marksPerQuestion
          : undefined,
        appendToExisting: req.body.appendToExisting === 'true',
      }
    );

    sendSuccess(res, result, result.message);
  }
);



export const create = asyncHandler(async (req: Request, res: Response) => {
  const exam = await svc.createExam(req.schoolId!, req.branchId!, req.user!.userId, req.body);
  sendSuccess(res, exam, 'Exam created', 201);
});

export const activeExams = asyncHandler(async (req: Request, res: Response) => {
  const { classId } = req.query as Record<string, string>;
  const result = await svc.getActiveExamsForStudent(req.schoolId!, req.branchId!, String(classId));
  sendSuccess(res, result, `${result.length} active exam(s) found`);
});

export const publish = asyncHandler(async (req: Request, res: Response) => {
  const exam = await svc.publishExam(req.schoolId!, req.branchId!, req.params.id as string);
  sendSuccess(res, exam, 'Exam published');
});

export const take = asyncHandler(async (req: Request, res: Response) => {
  const exam = await svc.getExamForStudent(req.schoolId!, req.branchId!, req.params.id as string);
  sendSuccess(res, exam);
});

export const submit = asyncHandler(async (req: Request, res: Response) => {
  const { examId, answers, timeTakenSeconds, offlineId } = req.body;
  const result = await svc.submitExam(req.schoolId!, req.branchId!, req.user!.userId, examId, answers, timeTakenSeconds, offlineId);
  sendSuccess(res, result, 'Exam submitted');
});

export const syncOffline = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.syncOfflineCBT(req.schoolId!, req.branchId!, req.body.submissions);
  sendSuccess(res, result);
});

export const results = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.getExamResults(req.schoolId!, req.branchId!, req.params.id as string);
  sendSuccess(res, data);
});