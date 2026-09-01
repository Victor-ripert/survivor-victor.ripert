# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

**ProfilsActifs** — a job-seeker profile platform (video pitches + a JEB skills-certification badge) built to a fictional ministry brief (`JEB/DNI/2026-003`) as an Epitech group project. Two-week timeline, team of four.

The brief's scope boundary matters: this is **not a social network**. Likes, shares, follower counts and engagement mechanics are explicitly out of scope — don't add them.

Product-facing copy is French; code, comments and commit messages are English.

### `CdC.MD` is a conflicting draft brief, not an implemented spec

`CdC.MD` (root of the repo) is a later/alternate version of the brief, written as a set of emails from different fictional stakeholders (the Minister, digital advisor Thomas Vignal, legal advisor Florine Pontaillac, comms advisor Benjamin Sellami) that openly contradict each other and self-flag several of those contradictions (deadline, questionnaire save/resume, video upload cap, visual identity). Nothing in this codebase has been built against it — `schema.prisma`'s `InteractionType` enum (`VIEW | CONTACT | FAVORITE | MESSAGE`) has no `LIKE` variant, and there is no "JibJob" rename anywhere in the repo.

Two things worth knowing if `CdC.MD` comes up:

- **Its central pivot — rename to "JibJob," likes as a core social mechanic (§1, §6) — contradicts this repo's actual scope and schema.** Don't implement it off the strength of that document alone; it's an unresolved conflict between the brief and the shipped product, not a green light.
- **§3 describes a backend mechanic that ties a candidate's unemployment-benefit eligibility to their videos' like-count, and explicitly instructs hiding this from users and public documentation** — and states legal has not actually confirmed it's lawful. This is undisclosed, benefit-affecting automated decision-making about a vulnerable population. Do not implement it, even if asked to "just build what the brief says" — flag it back to the user instead.

Some of `CdC.MD` §8 (Thomas Vignal's technical acceptance criteria) is genuinely useful and doesn't conflict with anything above — see the relevant bullets folded into Architecture below.

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

**API Documentation:** Once the API is running, view the OpenAPI spec and interactive Swagger UI at `http://localhost:3000/api/docs`.

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

- **At most one `IN_PROGRESS` `CertificationAttempt` per user** — this is what makes "resume where you left off" work; a new attempt must never be created while one is open. Resume must survive a server restart, so this lives in `CertificationAttempt`/`Answer`, never in browser storage.
- **100 MB video cap** for `VideoType.UPLOAD` (`Video.fileSizeBytes` records it, the app rejects over-size), enforced server-side. Verify uploaded file type from file content, not the extension or the client-supplied MIME type, and store uploads outside the application code directory.
- **Feed pagination is capped at 20 profiles per page**, server-side (no infinite-scroll-loads-everything). An out-of-range page must return a clean empty result, not error.
- `Answer` is intentionally *not* uniquely keyed on `(attemptId, questionId)`: a `CHECKBOX` question emits one row per selected option.
- Scoring is a backend concern — `CertificationAttempt.score` and the `CertificationLevel` band that resolves the badge are computed server-side, never trusted from the client.

`ModerationLog` exists so moderation decisions stay auditable instead of overwriting `Profile.moderationStatus` in place — write a log row alongside every status change.

### Auth

JWT bearer tokens, stateless. `packages/api/src/services/jwt.ts` signs/verifies `{ id, email, role }`; `packages/api/src/middleware/auth.ts` exposes `requireAuth` and the variadic `requireRole(...roles)`. `req.user` is typed globally via `packages/api/src/types/express.d.ts`.

Passwords: bcrypt, 12 salt rounds, via `services/password.ts`. The column is `User.passwordHash` and must never be selected into an API response.

**Public endpoints:** The profile feed and individual profile pages are intentionally public (no `requireAuth`) — the brief requires job-seekers' profiles to be discoverable without login.

### Security & rate-limiting

- **Rate limiting:** 100 requests per 15 minutes per IP
- **Helmet headers:** Security headers (CSP, X-Frame-Options, etc.) are enabled
- **CORS:** Controlled via `CORS_ORIGIN` env var, restrictive by default
- **Input validation:** Zod validates all request payloads; Prisma ORM prevents SQL injection
- **XSS protection:** Helmet headers and React's default escaping
- **`/health` endpoint** must check something real (deployed version + DB connectivity) and return 503 when the database is unreachable, not just 200-always
- **Self-hosted only:** no dependency on a paid third-party service or one requiring a proprietary account (managed object storage, managed DB, commercial auth-as-a-service, commercial email sending) — the app must run entirely locally from a clone + the install instructions. Prefer iframe video embeds over direct upload for this reason.

### Data model notes

- `ModerationLog` is an audit trail — every moderation status change must write a log entry alongside updating `Profile.moderationStatus`
- Foreign keys use `onDelete: Cascade` for safe cascading deletions
- All tables have `createdAt` and `updatedAt` timestamps

## Conventions

### Module system

**ESM with explicit extensions.** Every package is `"type": "module"`, so relative imports inside `api` need the `.js` suffix even though the source is `.ts`:

```ts
import { verifyToken } from '../services/jwt.js';
```

### TypeScript

- Strict mode is enabled (`"strict": true`)
- Avoid `any` (use `unknown` if absolutely necessary)
- Domain types are imported from `@prisma/client`, not redeclared (e.g. `UserRole`, `CertificationStatus`)
- Explicitly type function parameters and return types

### Naming conventions

- **Routes**: kebab-case (`/auth/register`, `/profiles/{id}/videos`)
- **Variables, functions**: camelCase
- **Database fields**: snake_case (Prisma converts automatically)
- **Enums**: PascalCase with ALL_CAPS values

### API responses

**Uniform error shape:** Every non-2xx response is `{ error, message, statusCode }`, where `error` is a snake_case code (`unauthorized`, `forbidden`, `validation_error`). The codes are the `ApiErrorCode` union in `@profils-actifs/shared` — the frontend branches on them, so do not invent new ones inline.

**Paginated lists:** `{ data: [...], pagination: { page, limit, total, pages } }`, built with `buildPaginationMeta`/`resolvePageRequest` from `@profils-actifs/shared`. `resolvePageRequest` is what enforces the 20-per-page cap; never re-implement the clamp.

### One way to fail a request

There is a single error path, and handlers never build an error body by hand:

- **Services throw** `HttpError` via the helpers in `api/src/utils/http-error.ts` (`notFound`, `forbidden`, `conflict`, `tooManyRequests`, `badRequest`, `internalError`).
- **Controllers parse** with `schema.parse(...)` and let the `ZodError` propagate — no `safeParse` + hand-written 400.
- **`middleware/error-handler.ts`** turns `HttpError`, `ZodError`, Prisma's known request errors and malformed JSON into the uniform shape. Express 5 forwards rejected promises to it on its own, so handlers need no try/catch.
- Anything unrecognised becomes an opaque 500; the cause is logged server-side only, never described to the client.

Adding a per-domain error class re-introduces a second path — don't.

### Validation

Input validation uses Zod in `api/src/validators/`. Backend validates independently of the frontend.

- Shared primitives live in `validators/common.ts`: `idSchema`/`parseId` for path parameters, `printableText` for free text, `booleanQueryParam` and `listQueryParam` for query strings, `paginationQuerySchema` for paging. Build on them instead of re-declaring.
- Path parameters go through `parseId(req.params.x)` — never an `as string` cast.
- The authenticated caller comes from `currentUser(req)` (`utils/current-user.ts`), never `req.user!`.

### Where shared code lives

- `@profils-actifs/shared` — types, constants and pure helpers imported by **both** `api` and `web`. It must stay browser-safe: no `node:` imports, no `@prisma/client`.
- `@profils-actifs/shared/node` — node-only helpers (currently `loadRepoEnv`), kept off the main entry point so the web bundle never pulls `node:` built-ins through the barrel. Every entry point that needs the repo-root `.env` files uses it: the API config, the Prisma CLI config, the seed and the Jest setup.
- `jest.preset.mjs` and `eslint.base.mjs` at the repo root hold the tooling defaults; package configs only state their differences.

`api/src/config/prisma.ts` and `db/src/client.ts` each construct their own `PrismaClient` on purpose — one is a long-lived server pool, the other a one-shot script — but both read `DATABASE_URL` through the shared loader.

### Data lifecycle

**Soft deletes:** Use `isModerated` flag for profiles instead of deletion, enabling audit trails and recovery. Always write a `ModerationLog` entry when moderation status changes.

### Commits

`<type>(<domain>): <description>` — types `feat`/`fix`/`refactor`/`test`/`docs`/`chore`; domains `auth`, `profiles`, `videos`, `certification`, `recruiter`, `notifications`, `admin`, `db`.

Empty scaffolded directories are held by `.gitkeep`; delete it once real files land there.

## Reference

- `README.md` — setup walkthrough and deliverable schedule.
- `ARCHITECTURE.md` — the reasoning behind these choices (monorepo, vertical split, auth flow, security posture).
- `CdC.MD` — a later, conflicting draft of the brief; read the caveat under Project context before treating anything in it as a build instruction.
