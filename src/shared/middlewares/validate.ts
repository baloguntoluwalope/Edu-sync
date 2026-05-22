import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodIssue } from 'zod';
import { ApiError } from '../utils/ApiError';

// ─────────────────────────────────────────────────────────────────────────────
// Recursively normalize all object keys to lowercase
// This handles cases where clients send { Email, Password } instead of
// { email, password } — common from Postman, mobile apps, etc.
// ─────────────────────────────────────────────────────────────────────────────
const normalizeKeys = (obj: unknown): unknown => {
  if (Array.isArray(obj)) {
    return obj.map(normalizeKeys);
  }

  if (obj !== null && typeof obj === 'object') {
    return Object.entries(obj as Record<string, unknown>).reduce(
      (acc, [key, value]) => {
        acc[key.charAt(0).toLowerCase() + key.slice(1)] = normalizeKeys(value);
        return acc;
      },
      {} as Record<string, unknown>
    );
  }

  return obj;
};

export const validate =
  (
    schema: ZodSchema,
    source: 'body' | 'query' | 'params' = 'body'
  ) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // Normalize keys before parsing so Email === email, Password === password
      const raw = source === 'body' ? normalizeKeys(req[source]) : req[source];

      const parsed = schema.parse(raw);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.issues.map((e: ZodIssue) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        throw new ApiError(422, 'Validation failed', errors);
      }
      next(err);
    }
  };