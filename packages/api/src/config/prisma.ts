import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from './env.js';

// Through the validated env rather than `process.env`, so the connection
// string cannot silently be `undefined` when a script imports this module
// before anything has loaded the repo-root env files.
//
// `max` matters, not just `connectionString`: left unset, the underlying
// `pg.Pool` defaults to 10 connections, which queues every request past it
// under real concurrency (load-test/results/findings-2026-09-08.md measured
// an 11-55x latency increase from exactly this before DATABASE_POOL_MAX
// existed).
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL, max: env.DATABASE_POOL_MAX });

export const prisma = new PrismaClient({ adapter });
