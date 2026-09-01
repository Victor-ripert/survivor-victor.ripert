import { Prisma, type CertificationAttempt } from '@prisma/client';
import { prisma } from '../../config/prisma.js';

export class AttemptNotFoundError extends Error {
  constructor() {
    super('Certification attempt not found');
    this.name = 'AttemptNotFoundError';
  }
}

export class AttemptForbiddenError extends Error {
  constructor() {
    super('This attempt does not belong to you');
    this.name = 'AttemptForbiddenError';
  }
}

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
          return { attempt: created, created: true };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      const isSerializationFailure = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
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
  if (!attempt) throw new AttemptNotFoundError();
  if (attempt.userId !== userId) throw new AttemptForbiddenError();

  // Never reveal points while the candidate could still be answering — see
  // the same rule applied to options in services/certification/questions.ts.
  if (attempt.status === 'IN_PROGRESS') {
    return { ...attempt, answers: attempt.answers.map(({ pointsEarned: _pointsEarned, ...rest }) => rest) };
  }
  return attempt;
};
