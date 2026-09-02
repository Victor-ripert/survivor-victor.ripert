/**
 * Mirrors `schema.prisma`'s `VideoType` enum and `openapi.yaml`'s `Video`
 * schema. `packages/api` types its Prisma queries with the real `VideoType`
 * from `@prisma/client` — this local mirror exists because `web` can't (and
 * shouldn't) depend on the server-only generated Prisma client. Keep the
 * literal values identical to the Prisma enum; that's what makes it a
 * mirror instead of a fork.
 *
 * Declared as a runtime array (not just a `type`) so it can double as the
 * single source of truth for Zod validators too — e.g.
 * `z.enum(VIDEO_TYPES)` in `api/src/validators/video.ts` — instead of the
 * same three literal strings being retyped in a second place that can
 * silently drift out of sync.
 */
import type { ModerationStatus } from './moderation.js';

export const VIDEO_TYPES = ['EXTERNAL_LINK', 'UPLOAD'] as const;
export type VideoType = (typeof VIDEO_TYPES)[number];

export const VIDEO_TITLE_MAX_LENGTH = 120;
export const VIDEO_DESCRIPTION_MAX_LENGTH = 500;

/** A video as returned by the API. */
export interface Video {
  id: string;
  profileId: string;
  title: string;
  description?: string;
  type: VideoType;
  url: string;
  duration?: number; // seconds
  /**
   * Always set by the API, independently of the parent profile's own
   * `moderationStatus` — see `ModerationStatus`'s doc comment in
   * `moderation.ts` for why the two aren't the same field.
   */
  moderationStatus: ModerationStatus;
  /**
   * The reason recorded with the last moderation decision, only when the
   * video is `REJECTED` and only on the owner's own view (`GET /profiles/me`).
   * Brief §7.9.2: the refusal reason is surfaced to the candidate.
   */
  moderationReason?: string;
  createdAt: string;
}

/**
 * Payload for `POST /profiles/{profileId}/videos`. Deliberately excludes
 * moderation/id/profileId fields — those are server-assigned, never
 * client-supplied. `consentAccepted` must be `true`: submitting the video is
 * the consent act the API logs with `CONSENT_TEXT_VERSION` (brief §7.1).
 */
export interface VideoInput {
  title: string;
  description?: string;
  type: VideoType;
  url: string;
  duration?: number;
  consentAccepted: true;
}
