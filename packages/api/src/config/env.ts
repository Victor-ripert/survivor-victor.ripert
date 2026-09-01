import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

const ENV_FILES = ['.env.local', '.env'] as const;
const MAX_LOOKUP_DEPTH = 6;

/** The compiled entry point sits one directory deeper than the source one, so
 *  the repo-root env files are located by walking up rather than by a fixed
 *  relative path. */
const findEnvFiles = (): string[] => {
  const found: string[] = [];
  let directory = dirname(fileURLToPath(import.meta.url));

  for (let depth = 0; depth < MAX_LOOKUP_DEPTH; depth += 1) {
    for (const file of ENV_FILES) {
      const candidate = resolve(directory, file);
      if (existsSync(candidate)) found.push(candidate);
    }

    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }

  return found;
};

const envFiles = findEnvFiles();
if (envFiles.length > 0) {
  loadDotenv({ path: envFiles, quiet: true });
}

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
