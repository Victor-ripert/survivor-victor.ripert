import type { Video } from './video.js';
import type { ModerationStatus } from './moderation.js';

/**
 * Mirrors `schema.prisma`'s `CertificationStatus` enum — see the note in
 * `video.ts` on why this is a local mirror rather than a `@prisma/client`
 * import, and why it's a runtime array rather than just a `type` (Zod
 * validators build `z.enum(...)` straight from these arrays).
 */
export const CERTIFICATION_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'] as const;
export type CertificationStatus = (typeof CERTIFICATION_STATUSES)[number];

/** Mirrors `schema.prisma`'s `SkillLevel` enum. */
export const SKILL_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const SKILL_NAME_MAX_LENGTH = 60;
export const PROFILE_HEADLINE_MAX_LENGTH = 120;
export const PROFILE_BIO_MAX_LENGTH = 2000;
export const PROFILE_FIELD_MAX_LENGTH = 120;

/** A skill from the shared catalog (`Skill` in `schema.prisma`). */
export interface Skill {
  id: string;
  name: string;
}

/** A skill tagged onto a profile, at a given proficiency level. */
export interface ProfileSkill {
  id: string;
  skillId: string;
  skillName: string;
  level: SkillLevel;
}

/** A profile as returned by the API (`GET /profiles`, `GET /profiles/{id}`, `GET /profiles/me`). */
export interface Profile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  headline?: string;
  bio?: string;
  location: string;
  sector: string;
  skills: ProfileSkill[];
  videos: Video[];
  certificationStatus: CertificationStatus;
  certificationScore?: number; // 0-100
  certificationBadge?: string;
  /**
   * Always set by the API — defaults to `PENDING` at creation and only an
   * admin can change it (see `ModerationAction`). Never sent by the client
   * on `POST /profiles/me`; see `ProfileInput` below.
   */
  moderationStatus: ModerationStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload for `POST /profiles/me` (create-or-update). `headline`/`bio` are
 * optional; sending an empty string clears the stored value, omitting the
 * key leaves it untouched.
 */
export interface ProfileInput {
  headline?: string;
  bio?: string;
  location: string;
  sector: string;
}

/** Payload for `POST /profiles/me/skills`. The skill is looked up (or created)
 *  by name in the shared catalog; the client never supplies an id. */
export interface ProfileSkillInput {
  skillName: string;
  level?: SkillLevel;
}
