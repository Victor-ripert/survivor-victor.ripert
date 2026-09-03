import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';

/**
 * §8.2 asks the probe to report the deployed version, and
 * `process.env.npm_package_version` only exists when npm itself started the
 * process — outside a local `npm run dev` the API runs as `node dist/index.js`
 * and the field read `unknown`, which is exactly the situation the probe is
 * meant to describe. Reading the manifest is accurate in both layouts:
 * package.json sits two levels up from this module under `src/` and `dist/`
 * alike.
 */
const API_VERSION = z
  .object({ version: z.string().min(1) })
  .parse(
    JSON.parse(readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8')),
  ).version;

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
    version: API_VERSION,
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
