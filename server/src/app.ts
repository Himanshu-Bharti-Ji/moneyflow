import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { healthRouter } from './modules/health/health.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { accountRouter }  from './modules/accounts/account.routes.js';
import { categoryRouter }    from './modules/categories/category.routes.js';
import { transactionRouter } from './modules/transactions/transaction.routes.js';
import { dashboardRouter }   from './modules/dashboard/dashboard.routes.js';
import { budgetRouter }        from './modules/budgets/budget.routes.js';
import { notificationRouter }  from './modules/notifications/notification.routes.js';
import { recurringRouter }     from './modules/recurring/recurring.routes.js';
import { reportsRouter }       from './modules/reports/reports.routes.js';

export function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: env.clientUrl,
    credentials: true,
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Global rate limiter
  app.use('/api', rateLimit({
    windowMs: 60_000,
    max: 200,
    message: { error: 'Too many requests, please slow down.' },
  }));

  // Routes
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/accounts',   accountRouter);
  app.use('/api/categories',   categoryRouter);
  app.use('/api/transactions', transactionRouter);
  app.use('/api/dashboard',    dashboardRouter);
  app.use('/api/budgets',        budgetRouter);
  app.use('/api/notifications',  notificationRouter);
  app.use('/api/recurring',      recurringRouter);
  app.use('/api/reports',        reportsRouter);

  // ── Production: serve built React app ──────────────────────────────────────
  // In production Render deploys one web service: Express serves both the API
  // and the compiled Vite output from client/dist.
  if (env.nodeEnv === 'production') {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname  = path.dirname(__filename);
    // server/dist/app.js  →  ../../client/dist
    const clientDist = path.join(__dirname, '../../client/dist');

    app.use(express.static(clientDist));

    // SPA fallback: any non-API route returns index.html
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  // 404 (only hit in development for non-API routes)
  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status ?? err.statusCode ?? 500;
    const message = err.message ?? 'Internal server error';
    if (env.nodeEnv === 'development') console.error('[error]', err);
    res.status(status).json({ error: message });
  });

  return app;
}
