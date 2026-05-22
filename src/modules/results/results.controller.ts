import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess } from '../../shared/utils/ApiResponse';
import * as svcRaw from './results.service';
const svc: any = svcRaw;

// ─── Score entry ──────────────────────────────────────────────────────────────
export const upsert = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.upsertResult(
    req.schoolId!, req.branchId!, req.user!.userId, req.body
  );
  sendSuccess(res, result, 'Score saved');
});

// ─── Bulk subjects for one student ────────────────────────────────────────────
export const bulkSubjectsForStudent = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.bulkSubjectsForStudent(
    req.schoolId!, req.branchId!, req.user!.userId, req.body
  );
  const message = (result as any)?.message ?? ((result as any)?.length ? `${(result as any).length} subject(s) saved` : 'Success');
  sendSuccess(res, result, message);
});

// ─── Parent generates token ───────────────────────────────────────────────────
export const parentGenerateToken = asyncHandler(async (req: Request, res: Response) => {
  const { admissionNumber, studentLastName, term, session } = req.body;

  if (!admissionNumber || !studentLastName || !term || !session) {
    throw new Error('admissionNumber, studentLastName, term and session are all required');
  }

  const result = await svc.generateToken(
    req.schoolId!,
    req.branchId!,
    String(req.body.studentId || ''),
    String(term),
    String(session)
  );
  const genMessage = (result as any)?.message ?? `Token generated. Sent to ${(result as any)?.sentToParents ?? 0} parent(s).`;
  sendSuccess(res, result, genMessage);
});

// ─── Parent views result with token ──────────────────────────────────────────
export const parentViewByToken = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.query as Record<string, string>;
  if (!token) throw new Error('Token is required');

  const result = await svc.viewResultByToken(String(token));
  sendSuccess(res, result);
});

// ─── Parent downloads PDF with token ─────────────────────────────────────────
export const parentDownloadPDF = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.query as Record<string, string>;
  if (!token) throw new Error('Token is required');

  // Verify parent owns this token
  await svc.viewResultByToken(String(token));

  // Generate PDF
  const pdf = await svc.generateResultPDFByToken(String(token));

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="result-${token}.pdf"`,
    'Content-Length': pdf.length,
  });
  res.end(pdf);
});

export const bulkInputForClass = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.bulkInputForClass(
    req.schoolId!, req.branchId!, req.user!.userId, req.body
  );
  const bulkInputMsg = (result as any)?.message ?? 'Success';
  sendSuccess(res, result, bulkInputMsg);
});

// ─── Compute positions ────────────────────────────────────────────────────────
export const computePositions = asyncHandler(async (req: Request, res: Response) => {
  const { classId, term, session } = req.body;
  const result = await svc.computeClassPositions(
    req.schoolId!, req.branchId!,
    String(classId), String(term), String(session), req.user!.userId
  );
  sendSuccess(res, result, 'Positions and subject rankings computed');
});

// ─── Publish results ──────────────────────────────────────────────────────────
export const publishForClass = asyncHandler(async (req: Request, res: Response) => {
  const { classId, term, session } = req.body;
  const result = await svc.publishResultsForClass(
    req.schoolId!, req.branchId!,
    String(classId), String(term), String(session), req.user!.userId
  );
  sendSuccess(res, result, `${result.published} result(s) published for class`);
});

export const publishForSchool = asyncHandler(async (req: Request, res: Response) => {
  const { term, session } = req.body;
  const result = await svc.publishResultsForSchool(
    req.schoolId!, req.branchId!,
    String(term), String(session), req.user!.userId
  );
  sendSuccess(res, result, `${result.published} result(s) published for all classes`);
});

// ─── Tokens ───────────────────────────────────────────────────────────────────
export const generateSingleToken = asyncHandler(async (req: Request, res: Response) => {
  const { studentId, term, session } = req.body;
  const result = await svc.generateToken(
    req.schoolId!, req.branchId!,
    String(studentId), String(term), String(session)
  );
  sendSuccess(res, result, `Token generated. Sent to ${result.sentToParents} parent(s).`);
});

export const bulkGenerateTokens = asyncHandler(async (req: Request, res: Response) => {
  const { term, session, classId } = req.body;
  const result = await svc.bulkGenerateTokens(
    req.schoolId!, req.branchId!,
    String(term), String(session), req.user!.userId,
    classId ? String(classId) : undefined
  );
  sendSuccess(res, result, `${result.generated} token(s) generated`);
});

export const getAllTokens = asyncHandler(async (req: Request, res: Response) => {
  const { term, session, classId, page, limit } = req.query as Record<string, string>;
  const result = await svc.getAllTokens(
    req.schoolId!, req.branchId!,
    String(term), String(session),
    classId ? String(classId) : undefined,
    +page || 1, +limit || 30
  );
  sendSuccess(res, result);
});

// ─── Mark paid ────────────────────────────────────────────────────────────────
export const markPaid = asyncHandler(async (req: Request, res: Response) => {
  const { studentId, term, session } = req.body;
  const result = await svc.markPaid(
    req.schoolId!, req.branchId!, req.user!.userId,
    String(studentId), String(term), String(session)
  );
  sendSuccess(res, result, 'Result marked as paid');
});

export const bulkMarkPaid = asyncHandler(async (req: Request, res: Response) => {
  const { term, session, classId } = req.body;
  const result = await svc.bulkMarkPaid(
    req.schoolId!, req.branchId!, req.user!.userId,
    String(term), String(session),
    classId ? String(classId) : undefined
  );
  sendSuccess(res, result, `${result.paid} result(s) marked as paid`);
});

// ─── View results ─────────────────────────────────────────────────────────────

// Public — outsiders/parents view result using token
export const viewByToken = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.query as Record<string, string>;
  const result = await svc.viewResultByToken(String(token));
  sendSuccess(res, result);
});

// Public — parents check result status using admission number
export const viewByAdmission = asyncHandler(async (req: Request, res: Response) => {
  const { schoolId, branchId, admissionNumber, term, session } = req.query as Record<string, string>;
  const result = await svc.viewResultByAdmission(
    String(schoolId), String(branchId),
    String(admissionNumber), String(term), String(session)
  );
  sendSuccess(res, result);
});

// Admin — view any result without token
export const adminView = asyncHandler(async (req: Request, res: Response) => {
  const { studentId, term, session } = req.query as Record<string, string>;
  const result = await svc.adminViewResult(
    req.schoolId!, req.branchId!,
    String(studentId), String(term), String(session)
  );
  sendSuccess(res, result);
});

// Admin — list all results for a class
export const listForClass = asyncHandler(async (req: Request, res: Response) => {
  const { classId, term, session, page, limit } = req.query as Record<string, string>;
  const result = await svc.listClassResults(
    req.schoolId!, req.branchId!,
    String(classId), String(term), String(session),
    +page || 1, +limit || 30
  );
  sendSuccess(res, result);
});

// 3-term full result for a student
export const studentFullResult = asyncHandler(async (req: Request, res: Response) => {
  const { session } = req.query as Record<string, string>;
  const result = await svc.getStudentFullResult(
    req.schoolId!, req.branchId!,
    String(req.params.studentId), String(session)
  );
  sendSuccess(res, result);
});

// ─── Update extras ────────────────────────────────────────────────────────────
export const updateExtras = asyncHandler(async (req: Request, res: Response) => {
  const { studentId, term, session, ...data } = req.body;
  const result = await svc.updateResultExtras(
    req.schoolId!, req.branchId!, req.user!.userId,
    String(studentId), String(term), String(session), data
  );
  sendSuccess(res, result, 'Result updated');
});

// ─── PDF downloads ────────────────────────────────────────────────────────────

// Admin downloads any student PDF without token
export const downloadPDFAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { studentId, term, session } = req.query as Record<string, string>;
  const pdf = await svc.generateResultPDF(
    req.schoolId!, req.branchId!,
    String(studentId), String(term), String(session)
  );

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="result-${studentId}-${term}-${session}.pdf"`,
    'Content-Length': pdf.length,
  });
  res.end(pdf);
});

// Public — download PDF with token (must be paid)
export const downloadPDFByToken = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.query as Record<string, string>;
  const pdf = await svc.generateResultPDFByToken(String(token));

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="result-${token}.pdf"`,
    'Content-Length': pdf.length,
  });
  res.end(pdf);
});

// import { Request, Response } from 'express';
// import { asyncHandler } from '../../shared/utils/asyncHandler';
// import { sendSuccess } from '../../shared/utils/ApiResponse';
// import * as svc from './results.service';

// export const upsert = asyncHandler(async (req: Request, res: Response) => {
//   const result = await svc.upsertResult(req.schoolId!, req.branchId!, req.user!.userId, req.body);
//   sendSuccess(res, result, 'Result saved');
// });

// export const bulkUpsert = asyncHandler(async (req: Request, res: Response) => {
//   const results = await svc.bulkUpsert(req.schoolId!, req.branchId!, req.user!.userId, req.body.entries);
//   sendSuccess(res, results, `${results.length} results saved`);
// });

// export const updateExtras = asyncHandler(async (req: Request, res: Response) => {
//   const { studentId, term, session, ...data } = req.body;
//   const result = await svc.updateResultExtras(
//     req.schoolId!, req.branchId!, req.user!.userId, studentId, term, session, data
//   );
//   sendSuccess(res, result, 'Result updated');
// });

// export const computePositions = asyncHandler(async (req: Request, res: Response) => {
//   const { classId, term, session } = req.body;
//   const result = await svc.computeClassPositions(
//     req.schoolId!, req.branchId!, classId, term, session, req.user!.userId
//   );
//   sendSuccess(res, result, 'Positions computed');
// });

// export const markPaid = asyncHandler(async (req: Request, res: Response) => {
//   const { studentId, term, session } = req.body;
//   const result = await svc.markPaid(req.schoolId!, req.branchId!, req.user!.userId, studentId, term, session);
//   sendSuccess(res, result, 'Result marked as paid');
// });

// export const generateToken = asyncHandler(async (req: Request, res: Response) => {
//   const { studentId, term, session } = req.body;
//   const result = await svc.generateToken(req.schoolId!, req.branchId!, studentId, term, session);
//   sendSuccess(res, result, `Token generated. Sent to ${result.sentToParents} parent(s).`);
// });

// export const viewResult = asyncHandler(async (req: Request, res: Response) => {
//   const { studentId, term, session, token } = req.query as Record<string, string>;
//   const result = await svc.viewResult(req.schoolId!, req.branchId!, studentId, term, session, token);
//   sendSuccess(res, result);
// });

// export const publishResults = asyncHandler(async (req: Request, res: Response) => {
//   const { term, session } = req.body;
//   const result = await svc.publishResults(req.schoolId!, req.branchId!, req.user!.userId, term, session);
//   sendSuccess(res, result, 'Results published');
// });

// export const studentFullResult = asyncHandler(async (req: Request, res: Response) => {
//   const { session } = req.query as Record<string, string>;
//   const studentId = Array.isArray(req.params.studentId) ? req.params.studentId[0] : req.params.studentId;
//   const result = await svc.getStudentFullResult(
//     req.schoolId!, req.branchId!, studentId, session
//   );
//   sendSuccess(res, result);
// });

// export const downloadResult = asyncHandler(async (req: Request, res: Response) => {
//   const { studentId, term, session, token } = req.query;
  
//   const pdfBuffer = await svc.downloadResultAsPDF(
//     req.user.schoolId, 
//     req.user.branchId, 
//     studentId as string, 
//     term as string, 
//     session as string, 
//     token as string
//   );

//   res.set({
//     'Content-Type': 'application/pdf',
//     'Content-Disposition': 'attachment; filename=ReportCard.pdf',
//     'Content-Length': pdfBuffer.length,
//   });

//   res.send(pdfBuffer);
// });