import { Prisma } from '@prisma/client';
import {
  buildPaginationMeta,
  resolvePageRequest,
  type Paginated,
  type Profile,
} from '@profils-actifs/shared';
import { prisma } from '../config/prisma.js';
import { notFound } from '../utils/http-error.js';
import {
  profileInclude,
  publicProfileInclude,
  toProfileDto,
  type ProfileWithRelations,
} from '../utils/mappers.js';
import type { PaginationQuery } from '../validators/common.js';
import type { AddSkillInput, UpsertProfileInput } from '../validators/profile.js';
import { findOrCreateSkill } from './skills.service.js';
import { isPubliclyVisible, publicProfileFilter } from './visibility.js';
import { getVideoProviderStatuses } from './video-status.service.js';

/** "Not yours" and "does not exist" deliberately read the same from outside,
 *  so the endpoint never confirms that an unapproved profile exists. */
const profileNotFound = () => notFound('Profil introuvable');
const ownProfileMissing = () => notFound("Vous n'avez pas encore créé votre profil");

/**
 * `GET /profiles` — the public feed: approved profiles of active adult
 * job-seekers, each with its approved videos only. A `page` beyond the last
 * one yields an empty `data` array, which is the clean result the brief asks
 * for rather than an error.
 */

export const getFeed = async ({ page, limit }: PaginationQuery): Promise<Paginated<Profile>> => {
  const pageRequest = resolvePageRequest(page, limit);
  const where = publicProfileFilter();

  const [profiles, total] = await prisma.$transaction([
    prisma.profile.findMany({
      where,
      include: publicProfileInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: pageRequest.skip,
      take: pageRequest.limit,
    }),
    prisma.profile.count({ where }),
  ]);

  return { data: profiles.map(toProfileDto), pagination: buildPaginationMeta(total, pageRequest) };
};

/**
 * `GET /profiles/{id}` — public. The owner sees their own profile whatever
 * its moderation state, every video included; anyone else only gets an
 * approved, adult profile with its approved videos.
 */
export const getPublicProfile = async (id: string, viewerId?: string): Promise<Profile> => {
  const visibility = await prisma.profile.findUnique({
    where: { id },
    select: {
      userId: true,
      moderationStatus: true,
      user: { select: { isActive: true, birthDate: true } },
    },
  });
  if (!visibility) throw profileNotFound();

  const isOwner = viewerId !== undefined && viewerId === visibility.userId;
  if (!isOwner && !isPubliclyVisible(visibility)) throw profileNotFound();

  const profile = await prisma.profile.findUniqueOrThrow({
    where: { id },
    include: isOwner ? profileInclude : publicProfileInclude,
  });

  return toProfileDtoWithProviderStatuses(profile);
};

/** `GET /profiles/me` — the caller's own profile, by construction. */
export const getOwnProfile = async (userId: string): Promise<Profile> => {
  const profile = await prisma.profile.findUnique({ where: { userId }, include: profileInclude });
  if (!profile) throw ownProfileMissing();

  return toProfileDtoWithProviderStatuses(profile);
};

/** An omitted field is left untouched, a blank one is cleared. */
const clearable = (value: string | undefined): string | null | undefined =>
  value === undefined ? undefined : value || null;

/**
 * `POST /profiles/me` — create-or-update. `moderationStatus` and
 * `certificationStatus` are never touched here: both default to `PENDING` on
 * creation and editing one's text changes neither.
 */
export const upsertOwnProfile = async (
  userId: string,
  input: UpsertProfileInput,
): Promise<Profile> => {
  const data = {
    headline: clearable(input.headline),
    bio: clearable(input.bio),
    location: input.location,
    sector: input.sector,
  };

  const upsert = () =>
    prisma.profile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
      include: profileInclude,
    });

  try {
    return toProfileDto(await upsert());
  } catch (error: unknown) {
    // Prisma's upsert is a read then a write, not one atomic statement: two
    // saves landing together can both miss the row and both try to create it.
    // `Profile.userId` is unique, so the loser gets P2002 — and by then the
    // row exists, which makes a single retry an update that succeeds.
    const isDuplicate =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
    if (!isDuplicate) throw error;

    return toProfileDto(await upsert());
  }
};

/**
 * `POST /profiles/me/skills` — tags a skill on the caller's profile, or
 * updates its level when already tagged (`ProfileSkill` is unique per
 * profile and skill).
 */
export const addSkill = async (userId: string, input: AddSkillInput): Promise<Profile> => {
  const profile = await prisma.$transaction(async (tx) => {
    const existing = await tx.profile.findUnique({ where: { userId }, select: { id: true } });
    if (!existing) throw ownProfileMissing();

    const skill = await findOrCreateSkill(tx, input.skillName);
    await tx.profileSkill.upsert({
      where: { profileId_skillId: { profileId: existing.id, skillId: skill.id } },
      create: { profileId: existing.id, skillId: skill.id, level: input.level },
      update: { level: input.level },
    });

    return tx.profile.findUniqueOrThrow({ where: { id: existing.id }, include: profileInclude });
  });

  return toProfileDtoWithProviderStatuses(profile);
};

/** `DELETE /profiles/me/skills/{skillId}` — ownership is part of the `where`,
 *  so removing a skill from someone else's profile matches nothing. */
export const removeSkill = async (userId: string, skillId: string): Promise<void> => {
  const { count } = await prisma.profileSkill.deleteMany({
    where: { skillId, profile: { userId } },
  });

  if (count === 0) throw notFound('Cette compétence ne figure pas sur votre profil');
};

const toProfileDtoWithProviderStatuses = async (
  profile: ProfileWithRelations,
): Promise<Profile> => {
  const dto = toProfileDto(profile);
  const statuses = await getVideoProviderStatuses(profile.videos);

  return {
    ...dto,
    videos: dto.videos.map((video) => ({
      ...video,
      providerStatus: statuses.get(video.id) ?? 'unavailable',
    })),
  };
};
