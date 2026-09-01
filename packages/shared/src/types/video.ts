/**
 * Mirrors `schema.prisma`'s `VideoType` enum and `openapi.yaml`'s `Video`
 * schema as a plain string-literal union. `packages/api` types its Prisma
 * queries with the real `VideoType` from `@prisma/client` — this local
 * mirror exists because `web` can't (and shouldn't) depend on the
 * server-only generated Prisma client. Keep the literal values identical to
 * the Prisma enum; that's what makes it a mirror instead of a fork.
 */
export type VideoType = 'EXTERNAL_LINK' | 'UPLOAD';

/** A video as returned by the API. */
export interface Video {
  id: string;
  profileId: string;
  title: string;
  description?: string;
  type: VideoType;
  url: string;
  duration?: number; // seconds
}

/**
 * Payload for `POST /profiles/{profileId}/videos`. Deliberately excludes
 * moderation/id/profileId fields — those are server-assigned, never
 * client-supplied.
 */
export interface VideoInput {
  title: string;
  description?: string;
  type: VideoType;
  url: string;
  duration?: number;
}
