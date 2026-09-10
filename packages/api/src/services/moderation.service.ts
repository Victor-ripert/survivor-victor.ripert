import { ModerationAction, type ModerationStatus, type Prisma } from '@prisma/client';
import {
  buildPaginationMeta,
  resolvePageRequest,
  type Paginated,
  type Profile,
  type VideoModerationAction,
  type VideoModerationDecision,
  type VideoModerationItem,
} from '@profils-actifs/shared';
import { prisma } from '../config/prisma.js';
import { notFound } from '../utils/http-error.js';
import { profileInclude, toProfileDto } from '../utils/mappers.js';
import type { PaginationQuery } from '../validators/common.js';
import type { VideoModerationInput, VideoModerationQuery } from '../validators/moderation.js';

export type ModerationEntityType = 'profile' | 'video';

/**
 * `ModerationAction` has four values, `ModerationStatus` only three, so this
 * mapping is lossy on purpose: `REQUIRE_CHANGES` hides the target like a
 * rejection would, and `FLAG` pulls it back out of public view for a second
 * look. The exact action survives in `ModerationLog.action`, which is what the
 * audit trail is for.
 */
const MODERATION_STATUS_BY_ACTION: Record<ModerationAction, ModerationStatus> = {
  APPROVE: 'APPROVED',
  REJECT: 'REJECTED',
  REQUIRE_CHANGES: 'REJECTED',
  FLAG: 'PENDING',
};

/**
 * One decision, for a profile or a video: the status update and the
 * `ModerationLog` row are written in a single transaction so neither can
 * exist without the other. `updateMany` reports the miss instead of throwing,
 * so the "not found" check happens inside the same transaction, before any
 * log row is written.
 */
export async function applyModeration(
  entityType: ModerationEntityType,
  entityId: string,
  adminId: string,
  action: ModerationAction,
  reason?: string,
  notes?: string,
): Promise<void> {
  const moderationStatus = MODERATION_STATUS_BY_ACTION[action];

  await prisma.$transaction(async (tx) => {
    if (entityType === 'profile') {
      const { count } = await tx.profile.updateMany({
        where: { id: entityId },
        data: { moderationStatus },
      });
      if (count === 0) throw notFound('Profil introuvable');

      await tx.moderationLog.create({
        data: { adminId, profileId: entityId, action, reason, notes },
      });
      return;
    }

    const { count } = await tx.video.updateMany({
      where: { id: entityId },
      data: { moderationStatus },
    });
    if (count === 0) throw notFound('Vidéo introuvable');

    await tx.moderationLog.create({ data: { adminId, videoId: entityId, action, reason, notes } });
  });
}

/**
 * `GET /admin/moderation/profiles` — the review queue, oldest first: a queue
 * is worked off first in, first reviewed, so an old submission is never
 * pushed down by newer ones.
 */
export async function listPendingProfiles({
  page,
  limit,
}: PaginationQuery): Promise<Paginated<Profile>> {
  const pageRequest = resolvePageRequest(page, limit);
  const where: Prisma.ProfileWhereInput = { moderationStatus: 'PENDING' };

  const [profiles, total] = await prisma.$transaction([
    prisma.profile.findMany({
      where,
      include: profileInclude,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      skip: pageRequest.skip,
      take: pageRequest.limit,
    }),
    prisma.profile.count({ where }),
  ]);

  return { data: profiles.map(toProfileDto), pagination: buildPaginationMeta(total, pageRequest) };
}

/** Only an approval or a refusal is a decision the candidate is told about. */
const DECISION_ACTIONS = [ModerationAction.APPROVE, ModerationAction.REJECT];

const moderationItemInclude = {
  profile: {
    select: { id: true, headline: true, user: { select: { firstName: true, lastName: true } } },
  },
  moderationLogs: {
    where: { action: { in: DECISION_ACTIONS } },
    orderBy: { createdAt: 'desc' },
    take: 1,
    include: { admin: { select: { id: true, firstName: true, lastName: true } } },
  },
} satisfies Prisma.VideoInclude;

type ModerationRow = Prisma.VideoGetPayload<{ include: typeof moderationItemInclude }>;

/** The `where` above only ever loads the two decision actions. */
const toVideoAction = (action: ModerationAction): VideoModerationAction =>
  action === ModerationAction.APPROVE ? 'APPROVE' : 'REJECT';

const toDecision = (log: ModerationRow['moderationLogs'][number]): VideoModerationDecision => ({
  action: toVideoAction(log.action),
  reason: log.reason ?? '',
  decidedAt: log.createdAt.toISOString(),
  decidedBy: { id: log.admin.id, firstName: log.admin.firstName, lastName: log.admin.lastName },
});

/** This is the one response that carries the address of a video that is not
 *  published: an administrator cannot decide on a video without watching it. */
const toModerationItem = (row: ModerationRow): VideoModerationItem => ({
  id: row.id,
  title: row.title,
  description: row.description,
  type: row.type,
  url: row.url,
  captionsUrl: row.captionsUrl,
  durationSeconds: row.duration,
  moderationStatus: row.moderationStatus,
  submittedAt: row.createdAt.toISOString(),
  applicant: {
    profileId: row.profile.id,
    firstName: row.profile.user.firstName,
    lastName: row.profile.user.lastName,
    headline: row.profile.headline,
  },
  lastDecision: row.moderationLogs[0] ? toDecision(row.moderationLogs[0]) : null,
});

/** `GET /admin/moderation/videos` — the queue by default, any status on request. */
export async function listVideosForModeration({
  status,
  page,
  limit,
}: VideoModerationQuery): Promise<Paginated<VideoModerationItem>> {
  const pageRequest = resolvePageRequest(page, limit);
  const where: Prisma.VideoWhereInput = status === 'ALL' ? {} : { moderationStatus: status };

  const [rows, total] = await prisma.$transaction([
    prisma.video.findMany({
      where,
      include: moderationItemInclude,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      skip: pageRequest.skip,
      take: pageRequest.limit,
    }),
    prisma.video.count({ where }),
  ]);

  return { data: rows.map(toModerationItem), pagination: buildPaginationMeta(total, pageRequest) };
}

/** `POST /admin/videos/{videoId}/moderate` — the decision, then the row as the
 *  queue now shows it, so the screen can replace it in place. */
export async function moderateVideo(
  videoId: string,
  adminId: string,
  input: VideoModerationInput,
): Promise<VideoModerationItem> {
  await applyModeration('video', videoId, adminId, input.action, input.reason, input.notes);

  const row = await prisma.video.findUniqueOrThrow({
    where: { id: videoId },
    include: moderationItemInclude,
  });

  return toModerationItem(row);
}
