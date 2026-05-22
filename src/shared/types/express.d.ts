import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: any; 
      schoolId?: string; // Add this
      branchId?: string; // Add this
      tenantId?: string; 
    }
  }
}

export {};