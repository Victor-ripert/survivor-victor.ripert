/**
 * Wire-format mirrors of the Prisma enums.
 *
 * The API imports the real enums from `@prisma/client` (per CLAUDE.md), but the
 * web package must not depend on the database client, so the shared DTOs use
 * string-literal unions instead. The API's mapper functions assign Prisma enum
 * values into these fields, so a divergence between the two breaks the build.
 *
 * `UserRole`, `CertificationStatus`, `SkillLevel` and `ModerationStatus` are
 * re-exported here rather than redeclared: `./user.js`, `./profile.js` and
 * `./moderation.js` already define each of these as a runtime array plus a
 * derived type (so a Zod validator can build `z.enum(...)` straight from the
 * same values — see e.g. `api/src/validators/video.ts`'s `VIDEO_TYPES`), and
 * a second, plain-union declaration of the same name here would collide with
 * that one the moment both get star-exported from this package's barrel
 * (`index.ts`) — TypeScript treats two same-named exports from different
 * modules as ambiguous unless they resolve to the exact same declaration.
 */
export type { UserRole } from './user.js';
export type { CertificationStatus, SkillLevel } from './profile.js';
export type { ModerationStatus } from './moderation.js';

export type InteractionType = 'VIEW' | 'CONTACT' | 'FAVORITE' | 'MESSAGE';
