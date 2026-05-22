import { Request, Response, NextFunction } from 'express';
import { School } from '../models/School';
import { ApiError } from '../utils/ApiError';

export const tenantGuard = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.schoolId) throw ApiError.unauthorized('School context missing');

    const school = await School.findById(req.schoolId).select('subscriptionStatus trialEndsAt subscriptionEndsAt').lean();
    if (!school) throw ApiError.notFound('School not found');

    const now = new Date();

    if (school.subscriptionStatus === 'suspended') {
      throw new ApiError(403, 'Your school account has been suspended. Please contact support.');
    }

    if (
      school.subscriptionStatus === 'trial' &&
      new Date(school.trialEndsAt) < now
    ) {
      throw new ApiError(402, 'Your trial has expired. Please subscribe to continue.');
    }

    if (
      school.subscriptionStatus === 'active' &&
      school.subscriptionEndsAt &&
      new Date(school.subscriptionEndsAt) < now
    ) {
      await School.findByIdAndUpdate(req.schoolId, { subscriptionStatus: 'expired' });
      throw new ApiError(402, 'Your subscription has expired. Please renew to continue.');
    }

    next();
  } catch (err) {
    next(err);
  }
};