/**
 * Every knob a load-test run might reasonably need to change, in one place,
 * all overridable via `-e NAME=value` (or an exported env var) without
 * touching `catalogue.js` — see `load-test/README.md` for the full list.
 *
 * k6 scripts run in their own JS runtime (goja), not Node: they cannot
 * `import` the monorepo's `@profils-actifs/*` TypeScript packages, which is
 * why the sector/location pools below are a short, hand-kept list rather
 * than a re-export of `packages/db/src/seed-data/fixture-pools.ts`.
 */

const DEFAULT_BASE_URL = 'http://localhost:3000/api';

// `Number(__ENV.X) || fallback` looks right but silently discards a
// deliberate `0` override (`0 || fallback` is `fallback`, since `0` is
// falsy) — e.g. `-e MIN_THINK_TIME_SECONDS=0` would quietly keep the
// default instead of removing think time. Only fall back when the env var
// is genuinely absent.
const numEnv = (name, fallback) => (__ENV[name] === undefined ? fallback : Number(__ENV[name]));

export const config = {
  baseUrl: __ENV.BASE_URL || DEFAULT_BASE_URL,

  recruiterEmail: __ENV.RECRUITER_EMAIL || 'recruteur@profils-actifs.fr',
  recruiterPassword: __ENV.RECRUITER_PASSWORD || 'Password123!',

  vus: numEnv('VUS', 100),
  duration: __ENV.DURATION || '2m',

  // How many catalogue pages requests are spread across — matches the ~25
  // pages a 500-profile / 20-per-page seed produces (packages/db/src/seed.ts,
  // shared/constants/pagination.ts's 20-per-page cap). An out-of-range page
  // is a valid, harmless request (the API returns a clean empty result), so
  // this only needs to be roughly right.
  cataloguePageCount: numEnv('CATALOGUE_PAGE_COUNT', 25),

  // Fraction of catalogue page views that go on to open one candidate's
  // profile + video list — a recruiter skims most pages but clicks into
  // only some candidates.
  profileClickThroughRate: numEnv('PROFILE_CLICK_THROUGH_RATE', 0.5),

  minThinkTimeSeconds: numEnv('MIN_THINK_TIME_SECONDS', 0.5),
  maxThinkTimeSeconds: numEnv('MAX_THINK_TIME_SECONDS', 2),

  // A small, realistic sample of the values packages/db/src/seed-data/
  // fixture-pools.ts generates profiles with — enough to put real load on
  // the sector/location trigram indexes without the script needing to know
  // the full pool.
  sectors: ['Informatique', 'Industrie', 'Logistique', 'Santé', 'Commerce'],
  locations: ['Lyon', 'Paris', 'Nantes', 'Toulouse', 'Marseille'],
};
