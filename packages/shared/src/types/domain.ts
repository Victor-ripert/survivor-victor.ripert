/**
 * Wire-format mirrors of the Prisma enums.
 *
 * The API imports the real enums from `@prisma/client` (per CLAUDE.md), but the
 * web package must not depend on the database client, so the shared DTOs use
 * string-literal unions instead. The API's mapper functions assign Prisma enum
 * values into these fields, so a divergence between the two breaks the build.
 */

export type UserRole = 'APPLICANT' | 'RECRUITER' | 'ADMIN';

export type CertificationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';

export type ModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type InteractionType = 'VIEW' | 'CONTACT' | 'FAVORITE' | 'MESSAGE';

export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
