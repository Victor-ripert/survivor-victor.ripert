# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

**ProfilsActifs** — a job-seeker profile platform (video pitches + a JEB skills-certification badge) built to a fictional ministry brief (`JEB/DNI/2026-003`) as an Epitech group project. Two-week timeline, team of four.

The brief's scope boundary matters: this is **not a social network**. Likes, shares, follower counts and engagement mechanics are explicitly out of scope — don't add them.

Product-facing copy is French; code, comments and commit messages are English.

## Commands

Run from the repo root (Turborepo fans out to every package):

```bash
npm run dev            # api + web in watch mode
npm run build
npm run test
npm run lint
npm run format         # prettier across the repo
```

Scoped to one package — prefer this while working inside a single domain:

```bash
npm run dev  -w @profils-actifs/api
npm run test -w @profils-actifs/web
```

Single test file / single test case (Jest):

```bash
npm test -w @profils-actifs/api -- src/services/jwt.test.ts
npm test -w @profils-actifs/api -- -t "rejects an expired token"
```

Database (Postgres runs in Docker; Prisma owns the tables inside it):

```bash
docker compose up -d              # postgres :5432, pgadmin :5050
npm run db:migrate                # prisma migrate dev — after any schema.prisma edit
npm run db:seed
npm run db:studio -w @profils-actifs/db   # browse/edit rows in the browser
```

`.env.local` is required before the API boots — `packages/api/src/services/jwt.ts` throws at import time if `JWT_SECRET` is missing. Copy `.env.example` as a starting point.

## Architecture

### Monorepo layout

Four workspaces under `packages/`:

| Package | Role |
|---|---|
| `api` | Express + TypeScript backend |
| `web` | React + Vite frontend |
| `shared` | Types/constants imported by both `api` and `web` |
| `db` | Prisma schema, migrations, seed |

### Ownership is vertical, not layered

Work is split by **feature domain**, each owned end-to-end (backend routes *and* the React pages that consume them) by one person:

- **A — Auth & notifications**: the three roles, permission middleware, notifying an applicant when a recruiter interacts. Also arbitrates the API contract when domains disagree.
- **B — Profiles & video**: profile CRUD, iframe video embeds, the public profile page, the paginated feed, profile/video moderation.
- **C — Certification questionnaire**: questions/options/weights, save-and-resume, scoring, badge. This is the critical path — the densest business logic in the project.
- **D — Recruiter space & dashboards**: catalogue + filtering, favourites, contact, recruiter and admin dashboards.

Consequence: don't reorganise `api/src` or `web/src` into layer-first buckets, and expect several people to touch adjacent files in the same directory.

### The API contract comes first

`packages/api/openapi.yaml` is the agreed contract between all four domains, written before the implementation. **Update it in the same change as any route, payload or status-code change** — a frontend domain is reading it as the spec while the backend is still being written.

Where the database and the contract disagree, `schema.prisma` carries an inline comment naming the gap (e.g. `Profile.moderationStatus` exists because the admin moderation endpoints need something to act on, but the contract's `Profile` schema doesn't expose it yet). Preserve those notes; resolve the gap in the contract rather than silently dropping the field.

### Data model invariants enforced in the app layer, not the DB

`packages/db/prisma/schema.prisma` is the source of truth for domain types — `UserRole`, `CertificationStatus` etc. are imported from `@prisma/client` rather than redeclared. Some rules the schema deliberately cannot express:

- **At most one `IN_PROGRESS` `CertificationAttempt` per user** — this is what makes "resume where you left off" work; a new attempt must never be created while one is open.
- **100 MB video cap** for `VideoType.UPLOAD` (`Video.fileSizeBytes` records it, the app rejects over-size).
- **Feed pagination is capped at 20 profiles per page.**
- `Answer` is intentionally *not* uniquely keyed on `(attemptId, questionId)`: a `CHECKBOX` question emits one row per selected option.
- Scoring is a backend concern — `CertificationAttempt.score` and the `CertificationLevel` band that resolves the badge are computed server-side, never trusted from the client.

`ModerationLog` exists so moderation decisions stay auditable instead of overwriting `Profile.moderationStatus` in place — write a log row alongside every status change.

### Auth

JWT bearer tokens, stateless. `packages/api/src/services/jwt.ts` signs/verifies `{ id, email, role }`; `packages/api/src/middleware/auth.ts` exposes `requireAuth` and the variadic `requireRole(...roles)`. `req.user` is typed globally via `packages/api/src/types/express.d.ts`.

Public-by-design endpoints (no `requireAuth`): the profile feed and individual profile pages — the brief requires profiles to be viewable without a recruiter account.

Passwords: bcrypt, 12 salt rounds, via `services/password.ts`. The column is `User.passwordHash` and must never be selected into an API response.

## Conventions

**ESM with explicit extensions.** Every package is `"type": "module"`, so relative imports inside `api` need the `.js` suffix even though the source is `.ts`:

```ts
import { verifyToken } from '../services/jwt.js';
```

**Uniform error shape.** Every non-2xx response is `{ error, message, statusCode }`, where `error` is a snake_case code (`unauthorized`, `forbidden`, `validation_error`). Match this in new handlers — the frontend branches on it.

**Paginated list shape.** `{ data: [...], pagination: { page, limit, total, pages } }`.

**Validation.** Zod, in `api/src/validators/`. Backend validates independently of the frontend.

**Commits.** `<type>(<domain>): <description>` — types `feat`/`fix`/`refactor`/`test`/`docs`/`chore`; domains `auth`, `profiles`, `videos`, `certification`, `recruiter`, `notifications`, `admin`, `db`.

Empty scaffolded directories are held by `.gitkeep`; delete it once real files land there.

## Reference

- `README.md` — setup walkthrough and deliverable schedule.
- `ARCHITECTURE.md` — the reasoning behind these choices (monorepo, vertical split, auth flow, security posture).
