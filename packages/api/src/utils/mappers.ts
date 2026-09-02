import type { Video as PrismaVideo } from '@prisma/client';
import type { Video } from '@profils-actifs/shared';

/**
 * Converts a Prisma `Video` row into the `Video` DTO from
 * `@profils-actifs/shared` — mainly `null` -> `undefined` for optional
 * fields, since Prisma and the shared DTO disagree on how "not set" is
 * represented. Shared by every service that returns a video
 * (`profile.service.ts` embeds videos inside a profile, `video.service.ts`
 * returns them directly), so the conversion only exists in one place.
 */
export function toVideoDto(video: PrismaVideo): Video {
  return {
    id: video.id,
    profileId: video.profileId,
    title: video.title,
    description: video.description ?? undefined,
    type: video.type,
    url: video.url,
    duration: video.duration ?? undefined,
  };
}
