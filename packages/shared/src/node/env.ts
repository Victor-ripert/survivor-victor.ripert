import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const ENV_FILES = ['.env.local', '.env'] as const;
const MAX_LOOKUP_DEPTH = 6;

/**
 * Loads the repo-root env files into `process.env`.
 *
 * Every entry point needs this and none of them can agree on a working
 * directory: the API runs from `packages/api` under tsx and from `dist` in
 * production, the Prisma CLI runs from `packages/db`, and Jest runs from the
 * package root. Rather than a relative path per caller, the files are located
 * by walking up from this module.
 *
 * dotenv assigns through `process.env` in JavaScript rather than through the
 * native loader, which matters under Jest: its test environment hands each
 * suite a *copy* of `process.env`, and `process.loadEnvFile` writes to the
 * real one, so the values would never reach the code under test.
 *
 * Variables already present win, so CI — where the job environment supplies
 * them — is unaffected.
 */
export const loadRepoEnv = (): string[] => {
  const loaded: string[] = [];
  let directory = dirname(fileURLToPath(import.meta.url));

  for (let depth = 0; depth < MAX_LOOKUP_DEPTH; depth += 1) {
    for (const file of ENV_FILES) {
      const candidate = resolve(directory, file);
      if (existsSync(candidate)) {
        config({ path: candidate, quiet: true });
        loaded.push(candidate);
      }
    }

    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }

  return loaded;
};
