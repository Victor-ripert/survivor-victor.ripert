# Load testing — recruiter catalogue

A [k6](https://k6.io/) scenario simulating recruiters browsing the candidate catalogue:
paginate `GET /api/recruiter/catalogue` (sometimes filtered or re-sorted), then open a
subset of candidates' `GET /api/profiles/:id` and `GET /api/profiles/:id/videos` — the
three busiest routes on this path.

k6 was chosen over Locust/Artillery/JMeter because it's a single static binary (no
runtime to install), the scenario is plain JavaScript, and it prints a summary —
median/p95/error-rate per route — without any extra plumbing.

## Prerequisites

1. **A running, seeded API.** From the repo root:

   ```bash
   docker compose up -d
   npm run db:migrate:prod -w @profils-actifs/db   # or db:migrate in dev
   npm run db:seed -w @profils-actifs/db            # 500 profiles / 300+ videos — see packages/db's seed
   ```

2. **A relaxed rate limit.** `apiRateLimiter` (`packages/api/src/middleware/rate-limit.ts`) is
   IP-keyed and defaults to 100 requests / 15 minutes (`RATE_LIMIT_MAX_REQUESTS`,
   `RATE_LIMIT_WINDOW_MS` — `packages/api/src/config/env.ts`). Every k6 VU on this machine
   shares one IP, so at the default limit the very first burst of requests exhausts the
   whole budget and the rest of the run is 429s — that measures the rate limiter, not the
   catalogue. Start the API with it raised for the duration of the load-test run only:

   ```bash
   RATE_LIMIT_MAX_REQUESTS=1000000 npm run dev -w @profils-actifs/api
   ```

   `catalogue.js`'s `setup()` makes one real catalogue request before spinning up any VU
   and fails immediately, with this exact instruction, if it gets a 429 — so a forgotten
   override is a one-line error, not a wall of failed checks.

3. **k6 itself.** Not an npm dependency (it's a Go binary, not a JS package) — install it
   per [k6.io/docs/get-started/installation](https://k6.io/docs/get-started/installation/),
   or drop a static binary from a
   [GitHub release](https://github.com/grafana/k6/releases) on your `PATH`.

## Running it

```bash
k6 run load-test/catalogue.js
```

Defaults to 100 VUs for 2 minutes, against `http://localhost:3000/api`, authenticated as
the seeded demo recruiter (`packages/db/src/seed-data/staff.ts`). Everything is
overridable with `-e`, without touching the script:

```bash
k6 run -e VUS=20 -e DURATION=30s -e BASE_URL=http://localhost:3000/api load-test/catalogue.js
```

| Variable                                            | Default                       | Meaning                                                      |
| --------------------------------------------------- | ----------------------------- | ------------------------------------------------------------ |
| `BASE_URL`                                          | `http://localhost:3000/api`   | API base URL                                                 |
| `RECRUITER_EMAIL`                                   | `recruteur@profils-actifs.fr` | Demo recruiter used for every VU (see below)                 |
| `RECRUITER_PASSWORD`                                | `Password123!`                | —                                                            |
| `VUS`                                               | `100`                         | Concurrent virtual users                                     |
| `DURATION`                                          | `2m`                          | How long the run lasts                                       |
| `CATALOGUE_PAGE_COUNT`                              | `25`                          | Highest catalogue page number requests are spread across     |
| `PROFILE_CLICK_THROUGH_RATE`                        | `0.5`                         | Fraction of catalogue views that open a profile + its videos |
| `MIN_THINK_TIME_SECONDS` / `MAX_THINK_TIME_SECONDS` | `0.5` / `2`                   | Pause between requests within one VU's iteration             |

All of the above live in `load-test/lib/config.js`.

To capture the raw output for a report (rather than just watching it scroll by):

```bash
k6 run --summary-export=load-test/results/summary.json load-test/catalogue.js
```

Past runs, including the baseline that found the connection-pool bottleneck below, live in
[`load-test/results/`](results/).

### Finding contention, not just latency

The default think time (0.5-2s between requests) is realistic, but it also means 100 VUs rarely
have more than a handful of requests in flight at once — it won't expose a resource with a low
concurrency ceiling (a connection pool, a semaphore, a single worker). To find that kind of
bottleneck specifically, remove the pacing so all VUs hammer the API back-to-back:

```bash
k6 run -e MIN_THINK_TIME_SECONDS=0 -e MAX_THINK_TIME_SECONDS=0 -e DURATION=45s load-test/catalogue.js
```

This is exactly how `load-test/results/findings-2026-09-08.md` found that
`packages/api/src/config/prisma.ts`'s Postgres pool (an unconfigured `pg.Pool`, defaulting to 10
connections) saturates under real concurrency — invisible in the realistic-pacing baseline,
an 11-55x latency increase once request pacing stopped hiding it.

## Structure

```
load-test/
├── catalogue.js       - entrypoint: the scenario itself (options, setup, default())
├── lib/
│   ├── config.js        - every overridable setting, in one place
│   ├── auth.js           - login() — one shared token, not one per VU
│   └── metrics.js         - per-route Trend + a recordRequest() check/measure helper
└── README.md
```

To point the scenario at a different route (or add a fourth one), export a new
`Trend` from `lib/metrics.js` and call `recordRequest(trend, res, expectedStatus, label)`
at the new call site in `catalogue.js` — nothing else needs to change shape.

## Why one shared recruiter account, not 100

All 100 VUs authenticate once, in `setup()`, as the same seeded recruiter — not because a
real 100-recruiter catalogue would look like that, but because this scenario measures
catalogue/profile/video _read_ throughput, and logging in 100 times would itself compete
for the same IP-keyed rate-limit budget the reads need. If a future scenario needs to
simulate distinct recruiter identities (per-recruiter favourites, contact history), that's
a deliberate extension — generate N recruiter accounts in the seed and log each VU in with
its own — not something this script does today.

## Known issue this test surfaces: `profile_detail` 404s on PENDING profiles

Running the default scenario, roughly 10-15% of `GET /api/profiles/:id` requests return
404 instead of 200 — closely tracking the ~12% of seeded profiles left `PENDING` by
`packages/db/src/seed-data/generated-applicants.ts`'s moderation-status weights. This is
**not a load-test artifact** — it reproduces at 1 VU — and not a bug in this script:

- The recruiter catalogue lists `APPROVED` and `PENDING` profiles (`visibleProfileFilter`,
  `packages/api/src/services/visibility.ts`) — pending stays visible so a moderation
  backlog never silently hides a candidate.
- The single-profile route only allows the owner or a strictly `APPROVED` profile through
  (`isPubliclyVisible`, same file, checked in `profile.service.ts:62`) — everything else,
  including a `PENDING` profile a recruiter can see listed, answers the same 404 as a
  nonexistent id.
- The real frontend hits exactly this gap: `packages/web/src/components/ProfileCard.tsx:107`
  links every catalogue card straight to `/profils/:id`, which calls the same public
  route (`packages/web/src/services/profiles.ts`). A recruiter can see a `PENDING`
  candidate in their catalogue, click it, and get "profil introuvable" — and nothing in
  the catalogue response (`CatalogueProfile` carries no `moderationStatus`) would let the
  UI warn them first.

This script's `profile_detail` check is left as a strict 200-only assertion on purpose —
softening it to also accept 404 would make the run "pass" by hiding a real finding rather
than reporting one. Expect `k6 run load-test/catalogue.js` to exit non-zero
(`http_req_failed` threshold crossed) until this visibility gap is either fixed or the
threshold is deliberately revisited alongside that fix.
