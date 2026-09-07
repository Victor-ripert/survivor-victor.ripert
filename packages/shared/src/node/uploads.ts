import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Matches the default in `api/src/config/env.ts`; kept here too so the seed
 *  resolves the same directory when the env file omits the variable. */
const DEFAULT_UPLOAD_DIR = '../profils-actifs-uploads';

/**
 * Repo root, from this module's own location rather than `process.cwd()`,
 * which depends on how the process was started — the API runs from
 * `packages/api` under tsx and from `dist` in production, the seed from
 * `packages/db`. Both the source tree (`packages/shared/src/node`) and the
 * built one (`packages/shared/dist/node`) sit four levels below the root.
 */
export const repoRoot = (): string =>
  resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

/**
 * Refuses a directory that is the repo root or nested inside it — uploaded
 * files must never sit among git-tracked application code (brief §8.5).
 */
export const assertUploadDirOutsideRepo = (absoluteDir: string): void => {
  const relativeToRepo = relative(repoRoot(), absoluteDir);
  const isInsideRepo = !relativeToRepo.startsWith('..') && !isAbsolute(relativeToRepo);

  if (isInsideRepo) {
    throw new Error(
      `UPLOAD_DIR ("${absoluteDir}") resolves inside this repository (${repoRoot()}). ` +
        'Point it at a directory outside the cloned repo — a sibling directory in ' +
        'development, or an absolute path on the host in production.',
    );
  }
};

/**
 * Where uploaded video files and their caption tracks live, resolved against
 * the repo root and guarded. Defined once because three callers need the same
 * answer and disagreeing would be silent: the API serves this directory over
 * `/uploads`, deletes from it when consent is revoked, and the seed writes its
 * demonstration fixture into it.
 */
export const resolveUploadDir = (
  uploadDir: string = process.env.UPLOAD_DIR ?? DEFAULT_UPLOAD_DIR,
): string => {
  const absoluteDir = resolve(repoRoot(), uploadDir);
  assertUploadDirOutsideRepo(absoluteDir);
  return absoluteDir;
};
