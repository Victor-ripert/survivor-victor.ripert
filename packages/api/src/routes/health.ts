import { Router } from 'express';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';

export const healthRouter = Router();

/**
 * Reports on something real: the process answers *and* the database accepts a
 * query. A deployment whose database is unreachable is not healthy, so it
 * answers 503 and any orchestrator watching this route takes it out of
 * rotation instead of serving errors.
 */
healthRouter.get('/', async (_req, res) => {
  const startedAt = Date.now();
  const base = {
    version: process.env.npm_package_version ?? 'unknown',
    environment: env.NODE_ENV,
    uptimeSeconds: Math.round(process.uptime()),
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      ...base,
      status: 'ok',
      database: { status: 'up', latencyMs: Date.now() - startedAt },
    });
  } catch (error) {
    console.error('[api] health check failed', error);
    res.status(503).json({ ...base, status: 'degraded', database: { status: 'down' } });
  }
});
