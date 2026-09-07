import { ModerationAction, type Prisma, type Video as PrismaVideo } from '@prisma/client';
import type { Video, Profile } from '@profils-actifs/shared';
import { publishedVideoFilter } from '../services/visibility.js';

/**
 * The latest moderation decision rides along with every video so the owner's
 * view can show why a video was refused (brief §7.9.2). Public and recruiter
 * surfaces only ever load `APPROVED` videos, for which no reason is exposed.
 */
export const videoDecisionInclude = {
  moderationLogs: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { action: true, reason: true },
  },
} satisfies Prisma.VideoInclude;

const videoOrder = { createdAt: 'asc' } satisfies Prisma.VideoOrderByWithRelationInput;

/**
 * What gets fetched alongside a `Profile` row for its owner or an admin:
 * every video, whatever its moderation state. Declared once and reused both as
 * the Prisma `include` clause and — via `Prisma.ProfileGetPayload` below — as
 * the input type of `toProfileDto`, so the two can never drift out of sync.
 */
export const profileInclude = {
  user: { select: { firstName: true, lastName: true, birthDate: true, isActive: true } },
  skills: { include: { skill: true }, orderBy: { skill: { name: 'asc' } } },
  videos: { orderBy: videoOrder, include: videoDecisionInclude },
} satisfies Prisma.ProfileInclude;

/** Same shape, but only approved videos — the public feed and profile page. */
export const publicProfileInclude = {
  ...profileInclude,
  videos: { where: publishedVideoFilter, orderBy: videoOrder, include: videoDecisionInclude },
} satisfies Prisma.ProfileInclude;

export type ProfileWithRelations = Prisma.ProfileGetPayload<{ include: typeof profileInclude }>;

type LastDecision = { action: ModerationAction; reason: string | null };

/** A video row, with or without its latest decision — a freshly created row
 *  has none to show. */
export type VideoRow = PrismaVideo & { moderationLogs?: LastDecision[] };

const rejectionReason = (video: VideoRow): string | undefined => {
  const last = video.moderationLogs?.[0];
  const isRejection =
    video.moderationStatus === 'REJECTED' &&
    (last?.action === ModerationAction.REJECT || last?.action === ModerationAction.REQUIRE_CHANGES);

  return isRejection && last?.reason ? last.reason : undefined;
};

/** Converts a Prisma `Video` row into the shared `Video` DTO — `null` becomes
 *  `undefined` for optional fields, dates become ISO strings. */
export function toVideoDto(video: VideoRow): Video {
  return {
    id: video.id,
    profileId: video.profileId,
    title: video.title,
    description: video.description ?? undefined,
    type: video.type,
    url: video.url,
    captionsUrl: video.captionsUrl ?? undefined,
    duration: video.duration ?? undefined,
    moderationStatus: video.moderationStatus,
    moderationReason: rejectionReason(video),
    createdAt: video.createdAt.toISOString(),
  };
}

/**
 * Converts Prisma's shape (nested relations, `null` for absent optional
 * fields) into the flat `Profile` DTO from `@profils-actifs/shared` that
 * `openapi.yaml` describes. Every function that returns a profile goes through
 * this, so the mapping only exists in one place.
 */
export function toProfileDto(profile: ProfileWithRelations): Profile {
  return {
    id: profile.id,
    userId: profile.userId,
    firstName: profile.user.firstName,
    lastName: profile.user.lastName,
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
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}
