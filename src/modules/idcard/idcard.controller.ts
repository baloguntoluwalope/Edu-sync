import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess } from '../../shared/utils/ApiResponse';
import * as svc from './idcard.service';

// ─── Orders ──────────────────────────────────────────────────────────────────
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const { attendees } = req.body;
  if (!Array.isArray(attendees)) {
    throw new Error('attendees must be an array of { id, type } objects');
  }
  const result = await svc.createIDCardOrder(
    req.schoolId!,
    req.branchId!,
    req.user!.userId,
    attendees
  );
  sendSuccess(res, result, result.message, 201);
});

export const createClassOrder = asyncHandler(
  async (req: Request, res: Response) => {
    const { classId } = req.body;
    if (!classId) throw new Error('classId is required');
    const result = await svc.createClassIDCardOrder(
      req.schoolId!,
      req.branchId!,
      req.user!.userId,
      String(classId)
    );
    sendSuccess(res, result, result.message, 201);
  }
);

export const createBranchStaffOrder = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await svc.createBranchStaffOrder(
      req.schoolId!,
      req.branchId!,
      req.user!.userId
    );
    sendSuccess(res, result, result.message, 201);
  }
);

export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as Record<string, string>;
  const result = await svc.listOrders(
    req.schoolId!,
    req.branchId!,
    +page || 1,
    +limit || 20
  );
  sendSuccess(res, result);
});

export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.getOrder(
    req.schoolId!,
    req.branchId!,
    String(req.params.orderId)
  );
  sendSuccess(res, result);
});

// ─── PDF ─────────────────────────────────────────────────────────────────────
export const previewCard = asyncHandler(async (req: Request, res: Response) => {
  const { attendeeId, attendeeType } = req.query as Record<string, string>;

  if (!attendeeId) throw new Error('attendeeId is required');
  if (!attendeeType) throw new Error('attendeeType is required');

  const pdf = await svc.previewSingleCard(
    req.schoolId!,
    req.branchId!,
    String(attendeeId),
    attendeeType as 'student' | 'teacher' | 'staff' | 'admin'
  );

  streamPDF(res, pdf, 'id-card-preview.pdf', true);
});

export const downloadCards = asyncHandler(
  async (req: Request, res: Response) => {
    const pdf = await svc.generateIDCardPDF(
      String(req.params.orderId),
      req.schoolId!,
      req.branchId!,
      req.user!.userId
    );

    streamPDF(res, pdf, `id-cards-${req.params.orderId}.pdf`);
  }
);

// Browser-friendly — open this URL directly in a browser tab
export const downloadBrowser = asyncHandler(
  async (req: Request, res: Response) => {
    const { token, orderId } = req.query as Record<string, string>;

    if (!token) throw new Error('token query param is required');
    if (!orderId) throw new Error('orderId query param is required');

    const { verifyToken } = await import('../../shared/utils/jwt');
    const payload = verifyToken(String(token));

    const pdf = await svc.generateIDCardPDF(
      String(orderId),
      payload.schoolId,
      payload.branchId,
      payload.userId
    );

    streamPDF(res, pdf, `id-cards-${orderId}.pdf`);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — Stream PDF with correct headers
// ─────────────────────────────────────────────────────────────────────────────
const streamPDF = (
  res: Response,
  pdf: Buffer,
  filename: string,
  inline = false
) => {
  res
    .status(200)
    .set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${filename}"`,
      'Content-Length': String(pdf.length),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff',
    })
    .end(pdf);
};