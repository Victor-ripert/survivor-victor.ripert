import http from 'k6/http';

/**
 * `POST /api/auth/login` (packages/api/src/routes/auth.ts), once, from
 * `setup()` — not once per VU. All 100 virtual recruiters sharing the one
 * seeded demo account (`packages/db/src/seed-data/staff.ts`) is a deliberate
 * simplification: this scenario measures catalogue/profile/video *read*
 * throughput, not per-recruiter identity, and logging in 100 times would
 * itself compete for the same IP-keyed rate-limit budget the reads need
 * (see README's "Rate limiting" section).
 *
 * Throws on failure so a bad run aborts at `setup()` with one clear message
 * instead of 100 VUs each failing the same way individually.
 */
export function login(baseUrl, email, password) {
  const res = http.post(`${baseUrl}/auth/login`, JSON.stringify({ email, password }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'login' },
  });

  if (res.status !== 200) {
    throw new Error(
      `login failed (status ${res.status}): ${res.body} — is the API running at ${baseUrl} ` +
        'and the database seeded (`npm run db:seed -w @profils-actifs/db`)? See load-test/README.md.',
    );
  }

  const token = res.json('token');
  if (!token) {
    throw new Error(
      'login response had no "token" field — has POST /api/auth/login\'s response shape changed?',
    );
  }

  return token;
}
