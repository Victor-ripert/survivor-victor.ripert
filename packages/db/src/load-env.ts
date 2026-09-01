import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ENV_FILES = ['.env.local', '.env'] as const;

/**
 * Loads the repo-root env files into `process.env`. The Prisma CLI and the
 * seed script are started outside the API process, so neither of them picks up
 * DATABASE_URL on its own. Variables already exported win, which keeps CI —
 * where the job environment supplies them — unaffected.
 */
export const loadRepoEnv = (): void => {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

  for (const file of ENV_FILES) {
    const path = resolve(repoRoot, file);
    if (existsSync(path)) process.loadEnvFile(path);
  }
};
