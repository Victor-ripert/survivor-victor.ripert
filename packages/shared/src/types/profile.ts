import type { Video } from './video.js';

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

/**
 * Mirrors `schema.prisma`'s `ModerationStatus` enum. Not yet on the
 * `Profile` schema in `openapi.yaml` (tracked as issue #7, "close contract
 * gaps") — the `Profile.moderationStatus` field below is kept optional so
 * it doesn't need reshaping once that lands, only the `?` dropped.
 */
export const MODERATION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

/** Mirrors `schema.prisma`'s `ModerationAction` enum — what an admin *does*, distinct from `ModerationStatus` (what the target's state *is*). */
export const MODERATION_ACTIONS = ['APPROVE', 'REJECT', 'FLAG', 'REQUIRE_CHANGES'] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

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
  /** See the `ModerationStatus` doc comment above re: the openapi.yaml gap. */
  moderationStatus?: ModerationStatus;
}

/**
 * Payload for `POST /profiles/me` (create-or-update). Matches the contract
 * as it stands today — `headline`/`bio` optional, `location`/`sector`
 * required. Skills aren't part of this payload; they get their own
 * endpoint once issue #7 closes that gap, at which point a
 * `ProfileSkillInput` type belongs here alongside this one.
 */
export interface ProfileInput {
  headline?: string;
  bio?: string;
  location: string;
  sector: string;
}
