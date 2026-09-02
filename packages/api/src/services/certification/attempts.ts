import { Prisma, type CertificationAttempt } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { forbidden, notFound } from '../../utils/http-error.js';

/** Shared by every route that loads an attempt, so "unknown attempt" and
 *  "someone else's attempt" always read the same way. */
export const attemptNotFound = () => notFound('Tentative de certification introuvable');
export const attemptForbidden = () => forbidden('Cette tentative ne vous appartient pas');

const MAX_SERIALIZATION_RETRIES = 3;

// The schema deliberately has no DB constraint for "at most one IN_PROGRESS
// attempt per user" (see the comment on CertificationAttempt) — it's an
// app-layer invariant instead. Serializable isolation is what makes that
// safe under concurrency: two simultaneous requests (e.g. two open tabs)
// both reading "no IN_PROGRESS attempt found" would otherwise both create
// one. Under SERIALIZABLE, Postgres detects that write skew and fails one
// of the two transactions (Prisma surfaces it as P2034) — we retry it,
// and the retry will see the other transaction's now-committed row.
export const startOrResumeAttempt = async (
  userId: string,
): Promise<{ attempt: CertificationAttempt; created: boolean }> => {
  for (let retry = 0; retry < MAX_SERIALIZATION_RETRIES; retry++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const existing = await tx.certificationAttempt.findFirst({
            where: { userId, status: 'IN_PROGRESS' },
          });
          if (existing) return { attempt: existing, created: false };

          const created = await tx.certificationAttempt.create({ data: { userId } });

          // The profile mirrors the questionnaire's state so the candidate's
          // space and the catalogue read "in progress" without a join; a
          // completed certification is never downgraded by a retake.
          await tx.profile.updateMany({
            where: { userId, certificationStatus: { in: ['PENDING', 'REJECTED'] } },
            data: { certificationStatus: 'IN_PROGRESS' },
          });

          return { attempt: created, created: true };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      const isSerializationFailure =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
      if (!isSerializationFailure || retry === MAX_SERIALIZATION_RETRIES - 1) throw error;
    }
  }
  /* istanbul ignore next -- unreachable: the loop above always returns or throws */
  throw new Error('startOrResumeAttempt: exhausted retries without returning or throwing');
};

export const getAttemptForUser = async (attemptId: string, userId: string) => {
  const attempt = await prisma.certificationAttempt.findUnique({
    where: { id: attemptId },
    include: { answers: { orderBy: { createdAt: 'asc' } } },
  });
  if (!attempt) throw attemptNotFound();
  if (attempt.userId !== userId) throw attemptForbidden();

  // Never reveal points while the candidate could still be answering — see
  // the same rule applied to options in services/certification/questions.ts.
  if (attempt.status === 'IN_PROGRESS') {
    return {
      ...attempt,
      answers: attempt.answers.map(({ pointsEarned: _pointsEarned, ...rest }) => rest),
    };
  }
  return attempt;
};
