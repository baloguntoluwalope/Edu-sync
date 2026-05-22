import app from './app';
import { connectDB } from './config/db';
import { redis } from './config/redis';
import { verifyMailer } from './config/mailer';
import { env } from './config/env';
import { logger } from './config/logger';

const start = async () => {
  try {
    await connectDB();
    await verifyMailer();

    const server = app.listen(env.PORT, () => {
      const baseUrl =
        env.NODE_ENV === 'production'
          ? process.env.BACKEND_URL ?? `http://localhost:${env.PORT}`
          : `http://localhost:${env.PORT}`;

      logger.info(`🚀 ${env.APP_NAME} running on port ${env.PORT} [${env.NODE_ENV}]`);

      logger.info(`📘 Swagger UI: ${baseUrl}/api-docs`);
      logger.info(`📄 Swagger JSON: ${baseUrl}/api-docs.json`);
    });

    const shutdown = async (signal: string) => {
      logger.warn(`${signal} received. Shutting down...`);

      server.close(async () => {
        try {
          await redis.quit();
          logger.info('Redis disconnected');
        } catch (err) {
          logger.error('Error disconnecting Redis:', err);
        }

        process.exit(0);
      });

      setTimeout(() => process.exit(1), 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) =>
      logger.error('Unhandled rejection:', reason)
    );

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught exception:', err);
      process.exit(1);
    });

  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();