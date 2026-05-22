import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { redisGet } from '../../config/redis';

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    const blacklisted = await redisGet(`blacklist:${token}`);
    if (blacklisted) throw ApiError.unauthorized('Token has been revoked');

    req.user = payload;

    // Superadmin has no real schoolId/branchId — skip setting them
    if (payload.role !== 'superadmin') {
      req.schoolId = payload.schoolId;
      req.branchId = payload.branchId;
    }

    next();
  } catch (err) {
    next(err instanceof ApiError ? err : ApiError.unauthorized('Invalid or expired token'));
  }
};

// POST /api/auth/login
// { "email": "superadmin@edusync.ng", "password": "SuperAdmin@123" }