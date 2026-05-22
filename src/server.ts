import app from './app';
import { connectDB } from './config/db';
import { redis } from './config/redis';
import { verifyMailer } from './config/mailer';
import { env } from './config/env';
import { logger } from './config/logger';

// Swagger UI is optional in environments without network access/npm installs.
let swaggerUi: any;
let swaggerSpec: any;
try {
  // require at runtime so app can start even if packages are not installed
  // (useful for offline development or CI with restricted network)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  swaggerUi = require('swagger-ui-express');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  swaggerSpec = require('./config/swagger').swaggerSpec;
} catch (err: any) {
  // logger may not be initialized yet in some boot paths
  // fallback to console if logger is unavailable
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('./config/logger').logger.warn('Swagger UI not available: ' + (err && err.message ? err.message : err));
  } catch {
    // eslint-disable-next-line no-console
    console.warn('Swagger UI not available:', err && err.message ? err.message : err);
  }
}





// Add after your existing imports, before routes

// ─── Swagger UI ───────────────────────────────────────────────────────────────
if (swaggerUi && swaggerSpec) {
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'EduSync API Docs',
      customCss: `
        .swagger-ui .topbar { background: #1a56db; }
        .swagger-ui .topbar .link { display: none; }
        .swagger-ui .topbar::before {
          content: '📚 EduSync API Documentation';
          color: white;
          font-size: 18px;
          font-weight: 700;
          padding: 10px 20px;
          display: block;
        }
      `,
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
      },
    })
  );
} else {
  // expose a lightweight placeholder JSON endpoint for API spec if available
  app.get('/api-docs', (_req, res) => {
    res.status(501).json({
      success: false,
      message: 'API docs not available in this environment',
    });
  });
}

// JSON spec endpoint (useful for Postman import)
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});


const start = async () => {
  try {
    await connectDB();
    await verifyMailer(); // ← Brevo SMTP check

    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 ${env.APP_NAME} running on port ${env.PORT} [${env.NODE_ENV}]`);
    });

    const shutdown = async (signal: string) => {
      logger.warn(`${signal} received. Shutting down...`);
      server.close(async () => {
        await redis.quit();
        logger.info('Redis disconnected');
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection:', reason));
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