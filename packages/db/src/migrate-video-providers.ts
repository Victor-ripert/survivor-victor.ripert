import { VideoType } from '@prisma/client';
import { prisma } from './client.js';

/**
 * The two values `VideoProviderName` actually took before the `VideoProvider`
 * abstraction existed (`packages/api/src/services/video-provider.ts`) —
 * every row old enough to need backfilling predates `ministry-placeholder`
 * entirely, so those two are the only cases this script ever needs to
 * derive. Written as literals, not imported: `db` sits below `api` in the
 * dependency graph (`api` depends on `db`, never the reverse), so there is
 * no shared module to import `VideoProviderName` from without inverting
 * that. Keep these two strings in sync with `VideoProviderName` by hand.
 */
const LOCAL_PROVIDER_NAME = 'local';
const EXTERNAL_LINK_PROVIDER_NAME = 'external-link';

export interface DerivedVideoProvider {
  providerName: string;
  providerRef: string;
}

/**
 * Derives what `providerRef`/`providerName` a row would have gotten had it
 * been created after V1/V2 landed, from what it already has: `type` and
 * `url`. Both of today's real providers make `store()`'s ref identical to
 * the servable URL (`video-providers/local.ts`, `video-providers/external-
 * link.ts`), so there is nothing to reconstruct beyond picking the provider
 * name — `url` itself is already the correct `providerRef`.
 */
export function deriveVideoProvider(type: VideoType, url: string): DerivedVideoProvider {
  switch (type) {
    case VideoType.UPLOAD:
      return { providerName: LOCAL_PROVIDER_NAME, providerRef: url };
    case VideoType.EXTERNAL_LINK:
      return { providerName: EXTERNAL_LINK_PROVIDER_NAME, providerRef: url };
    default: {
      // Exhaustiveness check: a future VideoType this script hasn't been
      // taught about must fail loudly, not silently backfill nothing.
      const exhaustive: never = type;
      throw new Error(`migrate-video-providers: unhandled VideoType "${String(exhaustive)}"`);
    }
  }
}

export interface BackfillSummary {
  /** Rows still missing providerRef when this run started. */
  before: number;
  /** Rows this run actually updated. */
  updated: number;
  /** Rows this run tried and failed to update — logged individually below. */
  failed: number;
  /** Rows still missing providerRef when this run finished. Non-zero after
   *  a clean run (no `failed`) means the process was interrupted mid-way;
   *  re-running picks up exactly where it left off. */
  after: number;
}

/**
 * Backfills `providerRef`/`providerName` for every `Video` row that
 * predates those columns (V2). Replayable by construction: it only ever
 * selects rows where `providerRef` is still null, so a row this script has
 * already touched — this run or a previous one — is never re-read or
 * re-derived. Running it twice, or killing it halfway and running it
 * again, converges on the same result as one clean run.
 *
 * Each row is updated independently, not inside one transaction spanning
 * all of them: a partial run must leave the rows it *did* finish migrated,
 * which is what makes the before/after counts below a meaningful progress
 * signal rather than an all-or-nothing gate.
 */
export async function backfillVideoProviders(): Promise<BackfillSummary> {
  const before = await prisma.video.count({ where: { providerRef: null } });

  const rows = await prisma.video.findMany({
    where: { providerRef: null },
    select: { id: true, type: true, url: true },
  });

  let updated = 0;
  let failed = 0;

  for (const row of rows) {
    const { providerName, providerRef } = deriveVideoProvider(row.type, row.url);

    try {
      await prisma.video.update({
        where: { id: row.id },
        data: { providerName, providerRef },
      });
      updated += 1;
    } catch (error: unknown) {
      failed += 1;
      console.error(`[migrate-video-providers] row ${row.id} not updated`, error);
    }
  }

  const after = await prisma.video.count({ where: { providerRef: null } });

  return { before, updated, failed, after };
}

async function main(): Promise<void> {
  const summary = await backfillVideoProviders();

  console.log(`Video rows missing providerRef before this run: ${summary.before}`);
  console.log(`Rows updated this run: ${summary.updated}`);
  if (summary.failed > 0) {
    console.log(`Rows that failed to update this run: ${summary.failed}`);
  }
  console.log(`Video rows missing providerRef after this run: ${summary.after}`);

  if (summary.after > 0) {
    console.log(
      '\nRun again to retry the rows still missing providerRef — already-migrated rows are skipped.',
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    // A disconnect that fails must not mask a migration error above, and
    // must not turn a successful run into a non-zero exit either.
    await prisma.$disconnect().catch((error: unknown) => {
      console.error('[migrate-video-providers] prisma did not disconnect cleanly', error);
    });
  });
