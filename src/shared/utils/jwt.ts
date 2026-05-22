import jwt, { Secret } from 'jsonwebtoken';
import { env } from '../../config/env';

export type UserRole = 'superadmin' | 'schooladmin' | 'teacher' | 'student' | 'parent';

export interface IUserPayload {
  userId: string;
  schoolId: string;
  branchId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export const signToken = (payload: Omit<IUserPayload, 'iat' | 'exp'>): string =>
  jwt.sign(payload, env.JWT_SECRET as Secret, { expiresIn: env.JWT_EXPIRES_IN } as any);

export const verifyToken = (token: string): IUserPayload =>
  jwt.verify(token, env.JWT_SECRET) as IUserPayload;