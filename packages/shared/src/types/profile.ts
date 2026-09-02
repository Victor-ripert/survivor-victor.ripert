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
}

/**
 * Payload for `POST /profiles/me` (create-or-update). Matches the contract
 * as it stands today — `headline`/`bio` optional, `location`/`sector`
 * required. Skills aren't part of this payload; `POST`/`DELETE
 * /profiles/me/skills` (see `openapi.yaml`) have their own request shape,
 * not yet mirrored here as a type since no service/controller implements
 * them yet — add a `ProfileSkillInput` type here when that lands.
 */
export interface ProfileInput {
  headline?: string;
  bio?: string;
  location: string;
  sector: string;
}
