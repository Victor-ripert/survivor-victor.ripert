import type { ModerationAction, ModerationStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { profileInclude, toProfileDto } from '../utils/mappers.js';
import { resolvePageWindow, toPaginationMeta } from '../utils/pagination.js';
import { ServiceError } from '../utils/errors.js';
import type { PaginationQuery } from '../validators/pagination.js';
import type { Profile, Paginated } from '@profils-actifs/shared';

export type ModerationEntityType = 'profile' | 'video';

/**
 * `ModerationAction` has four values, `ModerationStatus` only three — there
 * isn't a distinct "needs changes" status on the schema, so this mapping is
 * necessarily lossy. The choices, explained:
 *
 * - `APPROVE` -> `APPROVED`, `REJECT` -> `REJECTED`: the obvious cases.
 * - `REQUIRE_CHANGES` -> `REJECTED`: functionally the same as a rejection
 *   for visibility purposes (hidden from the public feed either way) — the
 *   distinction between "rejected outright" and "fix these things and
 *   resubmit" isn't lost, it's just not *in the status field*. It's
 *   preserved in the `ModerationLog.action` history instead, which is
 *   exactly what that audit trail is for.
 * - `FLAG` -> `PENDING`: a flag means "this needs a second look", which
 *   should pull it out of public visibility while that review happens —
 *   even if it was previously `APPROVED`. Unlike the other three, this one
 *   isn't meant to be a final decision.
 */
const MODERATION_STATUS_BY_ACTION: Record<ModerationAction, ModerationStatus> = {
  APPROVE: 'APPROVED',
  REJECT: 'REJECTED',
  REQUIRE_CHANGES: 'REJECTED',
  FLAG: 'PENDING',
};

/**
 * `POST /admin/profiles/{id}/moderate` — and, once the video-moderation
 * endpoint closes that contract gap, the identical action for videos. One
 * function for both entity types instead of an `approveProfile`/
 * `rejectProfile`/`approveVideo`/`rejectVideo` combinatorial mess.
 *
 * The status update and the `ModerationLog` row are written inside a
 * single `prisma.$transaction`, so the two can never drift apart: if the
 * process crashes, the connection drops, or anything else fails partway
 * through, the *entire* transaction rolls back — either both the status
 * change and its log row exist afterward, or neither does. That's what
 * "atomically" in the acceptance criteria means in practice, and it's also
 * why `updateMany` (which returns a count) is used instead of `update`
 * (which throws if the target's missing): the "not found" check needs to
 * happen *inside* the same transaction, before the log row is written, not
 * as a separate query that a status change could then race against.
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
      if (count === 0) {
        throw new ServiceError(404, 'not_found', 'Profile not found');
      }
      await tx.moderationLog.create({
        data: { adminId, profileId: entityId, action, reason, notes },
      });
    } else {
      const { count } = await tx.video.updateMany({
        where: { id: entityId },
        data: { moderationStatus },
      });
      if (count === 0) {
        throw new ServiceError(404, 'not_found', 'Video not found');
      }
      await tx.moderationLog.create({
        data: { adminId, videoId: entityId, action, reason, notes },
      });
    }
  });
}

/**
 * `GET /admin/moderation/profiles` — the admin review queue. Ordered
 * oldest-first (`asc`), deliberately the opposite of the public feed's
 * newest-first order in `profile.service.ts`'s `getFeed`: a moderation
 * queue is worked off like any other queue — first in, first reviewed —
 * so a profile submitted three days ago doesn't keep getting pushed down
 * by newer ones.
 */
export async function listPendingProfiles(pagination: PaginationQuery): Promise<Paginated<Profile>> {
  const window = resolvePageWindow(pagination);
  const where: Prisma.ProfileWhereInput = { moderationStatus: 'PENDING' };

  const [profiles, total] = await prisma.$transaction([
    prisma.profile.findMany({
      where,
      include: profileInclude,
      orderBy: { createdAt: 'asc' },
      skip: window.skip,
      take: window.take,
    }),
    prisma.profile.count({ where }),
  ]);

  return {
    data: profiles.map(toProfileDto),
    pagination: toPaginationMeta(window, total),
  };
}
