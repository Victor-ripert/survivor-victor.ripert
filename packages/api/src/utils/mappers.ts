import { Prisma } from '@prisma/client';
import type { Video as PrismaVideo } from '@prisma/client';
import type { Video, Profile } from '@profils-actifs/shared';

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

/**
 * What gets fetched alongside every `Profile` row. Declared once and reused
 * both as the Prisma `include` clause and — via `Prisma.ProfileGetPayload`
 * below — as the input type of `toProfileDto`, so the two can never drift
 * out of sync: add a relation here and both the query and the mapper see it.
 * Exported so any service touching profiles (`profile.service.ts`,
 * `moderation.service.ts`) queries and maps them identically.
 */
export const profileInclude = {
  skills: { include: { skill: true } },
  videos: true,
} satisfies Prisma.ProfileInclude;

export type ProfileWithRelations = Prisma.ProfileGetPayload<{ include: typeof profileInclude }>;

/**
 * Converts Prisma's shape (nested relations, `null` for absent optional
 * fields) into the flat `Profile` DTO from `@profils-actifs/shared` that
 * `openapi.yaml` describes (denormalized `skillName`, `undefined` instead
 * of `null`). Every function that returns a profile — in `profile.service.ts`
 * and now `moderation.service.ts`'s admin queue — goes through this, so the
 * mapping only exists in one place.
 *
 * Note: video-level moderation isn't filtered here — a profile that's
 * `APPROVED` can still have individual `PENDING`/`REJECTED` videos, and
 * this mapper currently returns all of a profile's videos regardless.
 * Flagging rather than deciding: whether the public feed should hide
 * not-yet-approved videos is a product call this covers neither issue.
 */
export function toProfileDto(profile: ProfileWithRelations): Profile {
  return {
    id: profile.id,
    userId: profile.userId,
    headline: profile.headline ?? undefined,
    bio: profile.bio ?? undefined,
    location: profile.location,
    sector: profile.sector,
    skills: profile.skills.map((profileSkill) => ({
      id: profileSkill.id,
      skillId: profileSkill.skillId,
      skillName: profileSkill.skill.name,
      level: profileSkill.level,
    })),
    videos: profile.videos.map(toVideoDto),
    certificationStatus: profile.certificationStatus,
    certificationScore: profile.certificationScore ?? undefined,
    certificationBadge: profile.certificationBadge ?? undefined,
    moderationStatus: profile.moderationStatus,
  };
}
