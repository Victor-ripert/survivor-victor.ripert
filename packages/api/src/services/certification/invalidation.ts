import type { Prisma } from '@prisma/client';
import { notifyAttemptInvalidated } from '../notifications.js';

/**
 * Invalidates every currently IN_PROGRESS certification attempt: purges its
 * answers, marks it ABANDONED, and notifies the candidate.
 *
 * Scope is deliberately global, not limited to attempts that already
 * answered the changed question — scoring runs against the whole active
 * question set (see scoreAttempt in scoring.ts), so any edit to an active
 * question shifts the scoring surface for every candidate mid-session, not
 * only those who had reached that specific question yet. See MA-3 for the
 * written justification.
 *
 * Takes a Prisma.TransactionClient rather than the shared client — this must
 * run inside the same transaction as the question edit that triggered it, or
 * a crash between the two could leave the question changed with stale
 * in-progress attempts still scoring against the old question set.
 */
export const invalidateInProgressAttempts = async (
  tx: Prisma.TransactionClient,
): Promise<number> => {
  const attempts = await tx.certificationAttempt.findMany({
    where: { status: 'IN_PROGRESS' },
    select: { id: true, userId: true },
  });

  for (const attempt of attempts) {
    await tx.answer.deleteMany({ where: { attemptId: attempt.id } });
    await tx.certificationAttempt.update({
      where: { id: attempt.id },
      data: { status: 'ABANDONED' },
    });
    await notifyAttemptInvalidated(attempt.userId, tx);
  }

  return attempts.length;
};
