import { z } from 'zod';
import type { SignOptions } from 'jsonwebtoken';
import { loadRepoEnv } from '@profils-actifs/shared/node';

loadRepoEnv();

/** `z.custom` carries jsonwebtoken's own literal union through instead of a
 *  bare `string`, so the parsed value drops straight into `sign` without a
 *  cast — and a malformed duration fails at boot rather than at first login. */
const jwtExpiry = z.custom<NonNullable<SignOptions['expiresIn']>>(
  (value) => typeof value === 'string' && /^\d+(ms|s|m|h|d|w|y)$/.test(value),
  { error: 'JWT_EXPIRY must be a duration such as 3600s, 24h or 7d' },
);

const csv = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  )
  .pipe(z.array(z.string()).min(1));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, { error: 'DATABASE_URL is required' }),
  JWT_SECRET: z.string().min(16, {
    error: 'JWT_SECRET must be at least 16 characters',
  }),
  JWT_EXPIRY: jwtExpiry.default('7d'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_HOST: z.string().min(1).default('localhost'),
  CORS_ORIGIN: csv.default(['http://localhost:5173']),
  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${details}`);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
