import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

const redisConfig = env.isProd
  ? {
      // Redis Cloud — parse from URL but add TLS and auth options
      ...(env.REDIS_URL.startsWith('rediss://')
        ? {
            tls: {
              rejectUnauthorized: false, // Redis Cloud requires this
            },
          }
        : {}),
    }
  : {}; // localhost needs no extra config

export const redis = new Redis(env.REDIS_URL, {
  ...redisConfig,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
  retryStrategy: (times) => {
    if (times > 5) {
      logger.error('Redis max retries reached — giving up');
      return null; // stop retrying
    }
    const delay = Math.min(times * 500, 3000);
    logger.warn(`Redis retry attempt ${times} in ${delay}ms`);
    return delay;
  },
});

redis.on('connect', () => logger.info('✅ Redis connected'));
redis.on('ready', () => logger.info('✅ Redis ready'));
redis.on('error', (err) => logger.error('❌ Redis error:', err));
redis.on('close', () => logger.warn('⚠️  Redis connection closed'));
redis.on('reconnecting', () => logger.warn('🔄 Redis reconnecting...'));

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const redisSet = async (
  key: string,
  value: string,
  ttlSeconds?: number
): Promise<void> => {
  if (ttlSeconds) {
    await redis.setex(key, ttlSeconds, value);
  } else {
    await redis.set(key, value);
  }
};

export const redisGet = async (key: string): Promise<string | null> => {
  return redis.get(key);
};

export const redisDel = async (key: string): Promise<void> => {
  await redis.del(key);
};

export const redisCacheOrFetch = async <T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<T> => {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached) as T;
  const fresh = await fetchFn();
  await redis.setex(key, ttl, JSON.stringify(fresh));
  return fresh;
};