import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { logger } from '../../config/logger';
import { env } from '../../config/env';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error(`${req.method} ${req.path} — ${err.message}`, {
    stack: err.stack,
    body: req.body,
  });

  // Handle malformed JSON body-parser error
  if ((err as any).type === 'entity.parse.failed' || (err as any).status === 400 && err instanceof SyntaxError) {
    res.status(400).json({
      success: false,
      message: 'Invalid JSON payload',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || null,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Mongoose duplicate key
  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyValue || {})[0];
    res.status(409).json({
      success: false,
      message: `${field} already exists`,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    res.status(422).json({
      success: false,
      message: 'Validation error',
      errors: Object.values((err as any).errors).map((e: any) => ({
        field: e.path,
        message: e.message,
      })),
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.status(500).json({
    success: false,
    message: env.isProd ? 'Internal server error' : err.message,
    timestamp: new Date().toISOString(),
  });
};