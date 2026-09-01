import { Prisma } from '@prisma/client';
import type { CertificationStatus } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import type { PaginationQuery } from '../validators/pagination.js';
import type { UpsertProfileInput } from '../validators/profile.js';
import { MAX_PAGE_SIZE } from '@profils-actifs/shared';
import type { Profile, Paginated } from '@profils-actifs/shared';

/**
 * What gets fetched alongside every `Profile` row. Declared once and reused
 * both as the Prisma `include` clause and — via `Prisma.ProfileGetPayload`
 * below — as the input type of `toProfileDto`, so the two can never drift
 * out of sync: add a relation here and both the query and the mapper see it.
 */
const profileInclude = {
  skills: { include: { skill: true } },
  videos: true,
} satisfies Prisma.ProfileInclude;

type ProfileWithRelations = Prisma.ProfileGetPayload<{ include: typeof profileInclude }>;

/**
 * Converts Prisma's shape (nested relations, `null` for absent optional
 * fields) into the flat `Profile` DTO from `@profils-actifs/shared` that
 * `openapi.yaml` describes (denormalized `skillName`, `undefined` instead
 * of `null`). Every function in this file that returns a profile goes
 * through this, so the mapping only exists in one place.
 *
 * Note: video-level moderation isn't filtered here — a profile that's
 * `APPROVED` can still have individual `PENDING`/`REJECTED` videos, and
 * this mapper currently returns all of a profile's videos regardless.
 * Flagging rather than deciding: whether the public feed should hide
 * not-yet-approved videos is a product call this issue doesn't cover.
 */
function toProfileDto(profile: ProfileWithRelations): Profile {
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
    videos: profile.videos.map((video) => ({
      id: video.id,
      profileId: video.profileId,
      title: video.title,
      description: video.description ?? undefined,
      type: video.type,
      url: video.url,
      duration: video.duration ?? undefined,
    })),
    certificationStatus: profile.certificationStatus,
    certificationScore: profile.certificationScore ?? undefined,
    certificationBadge: profile.certificationBadge ?? undefined,
    moderationStatus: profile.moderationStatus,
  };
}

export interface ProfileFeedFilters {
  sector?: string;
  location?: string;
  certificationStatus?: CertificationStatus;
}

/**
 * `GET /profiles` — the public feed. Only `APPROVED` profiles are ever
 * eligible; filters are applied on top of that, not instead of it.
 *
 * `pagination` is typed as the validator's own inferred output
 * (`PaginationQuery`) rather than a separately-declared `{ page, limit }`
 * shape, so this function's input can never quietly diverge from what
 * `paginationQuerySchema` actually guarantees. `limit` is still re-clamped
 * to `MAX_PAGE_SIZE` here as a second, defensive line of enforcement — the
 * 20/page cap is a data-model invariant (see CLAUDE.md), not just a
 * validator detail, so it also holds even if a future caller (Domain D's
 * catalogue, say) forgets to route its own query through the validator.
 *
 * A `page` beyond the last one isn't special-cased: Postgres/Prisma simply
 * return an empty `data` array for an out-of-range `OFFSET`, which is
 * already the "clean empty result, not an error" the brief asks for.
 */
export async function getFeed(
  filters: ProfileFeedFilters,
  pagination: PaginationQuery,
): Promise<Paginated<Profile>> {
  const limit = Math.min(pagination.limit, MAX_PAGE_SIZE);
  const page = pagination.page;
  const skip = (page - 1) * limit;

  const where: Prisma.ProfileWhereInput = {
    moderationStatus: 'APPROVED',
    ...(filters.sector && { sector: filters.sector }),
    ...(filters.location && { location: filters.location }),
    ...(filters.certificationStatus && { certificationStatus: filters.certificationStatus }),
  };

  const [profiles, total] = await prisma.$transaction([
    prisma.profile.findMany({
      where,
      include: profileInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.profile.count({ where }),
  ]);

  return {
    data: profiles.map(toProfileDto),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * `GET /profiles/{id}` — the public single-profile lookup. `viewerId` is
 * whoever's making the request, if anyone (the route is public, so an
 * anonymous visitor has none). A non-owner looking up a profile that isn't
 * `APPROVED` gets `null` back — identical to a profile that doesn't exist
 * at all — rather than a distinguishable "not visible yet" response, so
 * the endpoint never confirms to a stranger that a pending/rejected
 * profile exists.
 */
export async function getProfileById(id: string, viewerId?: string): Promise<Profile | null> {
  const profile = await prisma.profile.findUnique({
    where: { id },
    include: profileInclude,
  });

  if (!profile) {
    return null;
  }

  const isOwner = viewerId !== undefined && viewerId === profile.userId;
  if (profile.moderationStatus !== 'APPROVED' && !isOwner) {
    return null;
  }

  return toProfileDto(profile);
}

/**
 * `GET /profiles/me` — self-lookup only. Unlike `getProfileById`, this
 * applies no moderation-status gating at all: it's meant to be called with
 * the authenticated caller's own `userId`, so they're always the owner by
 * construction. Don't reuse this to look up an arbitrary user's profile
 * without adding your own authorization check first.
 */
export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: profileInclude,
  });

  return profile ? toProfileDto(profile) : null;
}

/**
 * `POST /profiles/me` — create-or-update, applicant only. `moderationStatus`
 * and `certificationStatus` are never set here: both default to `PENDING`
 * at the schema level on creation, and an update simply doesn't touch them
 * — editing your profile text doesn't by itself change your certification
 * or moderation state.
 *
 * A field omitted from `input` (e.g. no `headline` in the request body)
 * leaves the existing value untouched on update — Prisma treats an
 * `undefined` property in `data` as "don't change this", not as "clear
 * it". There's currently no way to explicitly clear `headline`/`bio` back
 * to empty through this endpoint, since the validator only allows the key
 * to be absent, not `null`; that's a real gap, not an oversight, and would
 * need `upsertProfileSchema` to accept `.nullable()` if it's needed.
 */
export async function upsertMyProfile(
  userId: string,
  input: UpsertProfileInput,
): Promise<Profile> {
  const profile = await prisma.profile.upsert({
    where: { userId },
    create: { userId, ...input },
    update: { ...input },
    include: profileInclude,
  });

  return toProfileDto(profile);
}
