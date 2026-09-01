// Jest evaluates this before any module under test, so config/env.ts sees a
// complete environment even when the developer has no .env.local.
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET ??= 'test-secret-with-enough-length';
process.env.CORS_ORIGIN ??= 'http://localhost:5173';
// High enough that the rate limiter never fires mid-suite.
process.env.RATE_LIMIT_MAX_REQUESTS = '100000';
