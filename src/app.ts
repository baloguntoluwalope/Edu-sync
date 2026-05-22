import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from './modules/auth/auth.routes';
import schoolsRoutes from './modules/schools/schools.routes';
import teachersRoutes from './modules/teachers/teachers.routes';
import branchRoutes from './modules/branches/branches.routes';
import studentRoutes from './modules/students/students.routes';
import communityRoutes from './modules/community/community.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import resultRoutes from './modules/results/results.routes';
import cbtRoutes from './modules/cbt/cbt.routes';
import notificationRoutes from './modules/notifications/notifications.routes';
import subscriptionRoutes from './modules/subscriptions/subscriptions.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import superadminRoutes from './modules/dashboard/superAdmin.routes';
import offlineSyncRoutes from './modules/offline_sync/offline.routes';
import staffRoutes from './modules/staff/staff.routes';
import idcardRoutes from './modules/idcard/idcard.routes';

import { errorHandler } from './shared/middlewares/errorHandler';
import { generalLimiter } from './shared/middlewares/rateLimiter';
import { env } from './config/env';
import { logger } from './config/logger';

// ─── Swagger (optional) ──────────────────────────────────────────────────────
let swaggerUi: any;
let swaggerSpec: any;
try {
  swaggerUi = require('swagger-ui-express');
  swaggerSpec = require('./config/swagger').swaggerSpec;
} catch (err: any) {
  logger.warn('Swagger UI not available: ' + (err?.message ?? err));
}

// ─── App ─────────────────────────────────────────────────────────────────────
const app = express();

// ─── Security & Parsing ──────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: env.isProd ? [env.FRONTEND_URL] : '*',
    credentials: true,
  })
);
app.use(
  morgan(env.isProd ? 'combined' : 'dev', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  })
);
app.use(
  express.json({
    limit: '10mb',
    verify: (req: any, _res, buf) => {
      if (req.originalUrl.includes('/webhook')) {
        req.rawBody = buf.toString();
      }
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiting ───────────────────────────────────────────────────────────
app.use('/api', generalLimiter);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: env.APP_NAME,
    env: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── Swagger UI ──────────────────────────────────────────────────────────────
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
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(swaggerSpec);
  });
} else {
  app.get('/api-docs', (_req, res) => {
    res.status(501).json({
      success: false,
      message: 'API docs not available in this environment',
    });
  });
}

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/schools', schoolsRoutes);
app.use('/api/v1/branches', branchRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/community', communityRoutes);
app.use('/api/v1/teachers', teachersRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/results', resultRoutes);
app.use('/api/v1/cbt', cbtRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/offline', offlineSyncRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/idcards', idcardRoutes);
app.use('/api/v1/superadmin', superadminRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    timestamp: new Date().toISOString(),
  });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler);

export default app;