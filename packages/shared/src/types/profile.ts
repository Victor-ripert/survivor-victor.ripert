import type { Video } from './video.js';

/** Mirrors `schema.prisma`'s `CertificationStatus` enum — see the note in `video.ts` on why this is a local literal union rather than a `@prisma/client` import. */
export type CertificationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';

/** Mirrors `schema.prisma`'s `SkillLevel` enum. */
export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

/**
 * Mirrors `schema.prisma`'s `ModerationStatus` enum. Not yet on the
 * `Profile` schema in `openapi.yaml` (tracked as issue #7, "close contract
 * gaps") — kept optional here so this type doesn't need reshaping once that
 * lands, only the `?` dropped.
 */
export type ModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

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
