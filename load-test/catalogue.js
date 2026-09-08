import http from 'k6/http';
import { sleep } from 'k6';
import { config } from './lib/config.js';
import { login } from './lib/auth.js';
import { makeRouteTrend, recordRequest } from './lib/metrics.js';

/**
 * Simulates a recruiter browsing the candidate catalogue: page through
 * results — sometimes filtered, sometimes re-sorted — then open a subset of
 * candidates' profile page and video list. Covers the three routes a
 * recruiter session actually hits (packages/api/src/routes/recruiter.ts,
 * profiles.ts, videos.ts): `GET /api/recruiter/catalogue`,
 * `GET /api/profiles/:id`, `GET /api/profiles/:id/videos`.
 *
 * Run: `k6 run load-test/catalogue.js` — 100 VUs / 2 minutes by default.
 * See `load-test/README.md` before the first run: the API's rate limiter
 * must be relaxed, or this test measures the rate limiter, not the app.
 */

const catalogueDuration = makeRouteTrend('catalogue_duration');
const profileDetailDuration = makeRouteTrend('profile_detail_duration');
const profileVideosDuration = makeRouteTrend('profile_videos_duration');

export const options = {
  vus: config.vus,
  duration: config.duration,
  thresholds: {
    http_req_failed: ['rate<0.01'],
  },
};

/**
 * Logs in once, shared by every VU (see `lib/auth.js`), and immediately
 * spends that token on one real catalogue request — so a misconfigured rate
 * limit fails loudly here, with one clear message, instead of as 100 VUs'
 * worth of 429s a minute into the run.
 */
export function setup() {
  const token = login(config.baseUrl, config.recruiterEmail, config.recruiterPassword);

  const probe = http.get(`${config.baseUrl}/recruiter/catalogue?page=1&limit=20`, {
    headers: { Authorization: `Bearer ${token}` },
    tags: { name: 'catalogue' },
  });

  if (probe.status === 429) {
    throw new Error(
      'The API rate-limited the setup probe before the test even started. ' +
        `apiRateLimiter is IP-keyed and shared by every VU on this machine — raise RATE_LIMIT_MAX_REQUESTS ` +
        'for this run (see load-test/README.md, section "Rate limiting").',
    );
  }
  if (probe.status !== 200) {
    throw new Error(
      `setup probe to /recruiter/catalogue failed (status ${probe.status}): ${probe.body}`,
    );
  }

  return { token };
}

function randomPage() {
  return 1 + Math.floor(Math.random() * config.cataloguePageCount);
}

// k6's JS runtime (goja) does not implement `URLSearchParams` — build the
// query string by hand instead.
function toQueryString(params) {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function think() {
  const seconds =
    config.minThinkTimeSeconds +
    Math.random() * (config.maxThinkTimeSeconds - config.minThinkTimeSeconds);
  sleep(seconds);
}

export default function (data) {
  const authHeaders = { Authorization: `Bearer ${data.token}` };

  const params = { page: randomPage(), limit: 20 };
  // Most requests paginate the unfiltered default (`sort=recent`); the rest
  // exercise a sector/location filter or the score sort — closer to how a
  // recruiter actually narrows a catalogue than pure unfiltered paging, and
  // it puts real load on the sector/location trigram indexes too
  // (docs/decisions/02-index-du-catalogue.md).
  const roll = Math.random();
  if (roll < 0.1) params.sector = pick(config.sectors);
  else if (roll < 0.2) params.location = pick(config.locations);
  else if (roll < 0.3) params.sort = 'score';

  const catalogueRes = http.get(`${config.baseUrl}/recruiter/catalogue?${toQueryString(params)}`, {
    headers: authHeaders,
    tags: { name: 'catalogue' },
  });
  const catalogueOk = recordRequest(catalogueDuration, catalogueRes, 200, 'catalogue');

  think();

  if (catalogueOk) {
    const profiles = catalogueRes.json('data') ?? [];

    if (profiles.length > 0 && Math.random() < config.profileClickThroughRate) {
      const profile = pick(profiles);

      const profileRes = http.get(`${config.baseUrl}/profiles/${profile.id}`, {
        tags: { name: 'profile_detail' },
      });
      const profileOk = recordRequest(profileDetailDuration, profileRes, 200, 'profile_detail');

      think();

      if (profileOk) {
        const videosRes = http.get(`${config.baseUrl}/profiles/${profile.id}/videos`, {
          tags: { name: 'profile_videos' },
        });
        recordRequest(profileVideosDuration, videosRes, 200, 'profile_videos');
      }
    }
  }

  think();
}
