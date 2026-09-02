import { loadRepoEnv } from '@profils-actifs/shared/node';

// Jest `setupFiles` run before any test file's imports are evaluated, which
// guarantees DATABASE_URL/JWT_SECRET exist before config/prisma.ts or
// services/jwt.ts read process.env — unlike loading env inline in a test
// file, this does not depend on import order.
loadRepoEnv();

// Fallbacks for whatever the env files did not supply, so the unit suites
// (which mock Prisma and never open a connection) still run on a machine with
// no env file. Neither these nor loadRepoEnv overwrite an existing variable,
// so a real DATABASE_URL always wins — the integration suites need it.
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET ??= 'test-secret-with-enough-length';
process.env.CORS_ORIGIN ??= 'http://localhost:5173';

// High enough that the rate limiter never fires mid-suite.
process.env.RATE_LIMIT_MAX_REQUESTS = '100000';
