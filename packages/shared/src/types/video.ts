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

/**
 * Mirrors `VideoProvider.status()`'s return type (`api/src/services/
 * video-provider.ts`) — declared here, not there, because `VideoPlayer.tsx`
 * (web) needs to render the same three states the provider reports, and web
 * cannot import from the api package. The API imports this type rather than
 * redeclaring it, same pattern as `VIDEO_TYPES` above.
 */
export const VIDEO_PROVIDER_STATUSES = ['ready', 'processing', 'unavailable'] as const;
export type VideoProviderStatus = (typeof VIDEO_PROVIDER_STATUSES)[number];

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

  /**
   * Current availability of the provider serving this video.
   * This is distinct from moderationStatus: a video can be approved
   * while its provider is temporarily unavailable.
   */
  providerStatus: VideoProviderStatus;

  duration?: number;
  captionsUrl?: string;
  moderationStatus: ModerationStatus;
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
