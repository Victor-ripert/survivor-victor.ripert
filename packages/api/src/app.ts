import 'dotenv/config';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { prisma } from './config/prisma.js';
import { authRouter } from './routes/auth.js';
import { profilesRouter } from './routes/profiles.js';
import { videosRouter } from './routes/videos.js';
import { adminRouter } from './routes/admin.js';
import { ServiceError } from './utils/errors.js';

/**
 * Builds the configured Express app without starting a server — kept
 * separate from `index.ts` specifically so tests can `import { app }` and
 * drive it with `supertest` (already a dependency) directly in memory,
 * with no real port ever bound. `index.ts` is the only file that calls
 * `app.listen()`.
 */
export const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
app.use(
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  }),
);
app.use(express.json());

/**
 * Checks something real (CLAUDE.md's requirement) rather than always
 * returning 200 — a `SELECT 1` round trip to Postgres, which fails fast if
 * the database is unreachable. Deliberately outside `/api`: infrastructure
 * (load balancers, container orchestrators) conventionally probes health
 * at a fixed, unversioned path rather than through the API surface.
 */
app.get('/health', async (_req: Request, res: Response) => {
  const version = process.env.npm_package_version ?? 'unknown';
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', version, database: 'connected' });
  } catch {
    res.status(503).json({ status: 'degraded', version, database: 'unreachable' });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/profiles', profilesRouter);
// Bare /api, not /api/videos — see routes/videos.ts for why.
app.use('/api', videosRouter);
app.use('/api/admin', adminRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'not_found', message: 'Route not found', statusCode: 404 });
});

/**
 * The one place `ServiceError` gets translated into an HTTP response.
 * Every controller in this project calls into a service and simply lets a
 * thrown `ServiceError` propagate — Express 5 (unlike 4) automatically
 * forwards a rejected async handler to this middleware, so no controller
 * needs its own try/catch around a service call. Needs all four
 * parameters, `next` included even though it's unused, or Express won't
 * recognize this as error-handling middleware at all.
 */
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ServiceError) {
    res.status(err.statusCode).json({
      error: err.errorCode,
      message: err.message,
      statusCode: err.statusCode,
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: 'internal_error',
    message: 'Something went wrong.',
    statusCode: 500,
  });
});
