import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../../config/redis';
import { env } from '../../config/env';

const createLimiter = (windowMs: number, max: number, prefix: string) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      // @ts-ignore — sendCommand exists on ioredis
      sendCommand: (...args: string[]) => redis.call(...args),
      prefix: `rl:${prefix}:`,
    }),
    message: {
      success: false,
      message: 'Too many requests. Please slow down and try again.',
    },
  });

// General API limiter — 100 requests per 15 minutes
export const generalLimiter = createLimiter(
  env.RATE_LIMIT_WINDOW_MS,
  env.RATE_LIMIT_MAX,
  'general'
);

// Auth limiter — 10 login attempts per 15 minutes
export const authLimiter = createLimiter(15 * 60 * 1000, 10, 'auth');

// Result token limiter — 5 per 10 minutes
export const resultTokenLimiter = createLimiter(10 * 60 * 1000, 5, 'result-token');

// Upload limiter — 20 per hour
export const uploadLimiter = createLimiter(60 * 60 * 1000, 20, 'upload');