import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess } from '../../shared/utils/ApiResponse';
import * as svc from './subscriptions.service';

export const getPlans = asyncHandler(async (req: Request, res: Response) => {
  const plans = svc.getPlans();
  sendSuccess(res, plans, 'Available subscription plans');
});

export const getCurrentSubscription = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await svc.getCurrentSubscription(req.schoolId!);
    sendSuccess(res, result);
  }
);

export const initializePayment = asyncHandler(
  async (req: Request, res: Response) => {
    const { plan } = req.body;
    if (!plan) throw new Error('plan is required');
    const result = await svc.initializePayment(
      req.schoolId!,
      req.user!.userId,
      plan
    );
    sendSuccess(res, result, result.message);
  }
);

export const webhook = asyncHandler(async (req: Request, res: Response) => {
  const signature =
    (req.headers['x-korapay-signature'] as string) || '';
  await svc.handleWebhook(JSON.stringify(req.body), signature);
  res.sendStatus(200);
});

export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const { paymentRef } = req.params;
  const result = await svc.verifyPayment(String(paymentRef));
  sendSuccess(res, result, result.message);
});

export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as Record<string, string>;
  const result = await svc.getHistory(req.schoolId!, +page || 1, +limit || 10);
  sendSuccess(res, result);
});

export const cancelPending = asyncHandler(async (req: Request, res: Response) => {
  const { paymentRef } = req.body;
  if (!paymentRef) throw new Error('paymentRef is required');
  const result = await svc.cancelPending(
    req.schoolId!,
    String(paymentRef),
    req.user!.userId
  );
  sendSuccess(res, result, result.message);
});