import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import type { SubmitAnswerInput } from '../../validators/certification.js';
import { AttemptNotFoundError, AttemptForbiddenError } from './attempts.js';

export { AttemptNotFoundError, AttemptForbiddenError };

export class AttemptNotInProgressError extends Error {
  constructor() {
    super('This attempt is no longer in progress');
    this.name = 'AttemptNotInProgressError';
  }
}

export class QuestionNotFoundError extends Error {
  constructor() {
    super('Certification question not found');
    this.name = 'QuestionNotFoundError';
  }
}

export class InvalidAnswerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAnswerError';
  }
}

// Never selects pointsEarned — scoring stays hidden until the attempt is
// submitted, same rule as getAttemptForUser in attempts.ts.
const answerSelect = {
  id: true,
  attemptId: true,
  questionId: true,
  optionId: true,
  textAnswer: true,
  numericAnswer: true,
} satisfies Prisma.AnswerSelect;

export const saveAnswer = async (attemptId: string, userId: string, input: SubmitAnswerInput) => {
  const attempt = await prisma.certificationAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt) throw new AttemptNotFoundError();
  if (attempt.userId !== userId) throw new AttemptForbiddenError();
  if (attempt.status !== 'IN_PROGRESS') throw new AttemptNotInProgressError();

  const question = await prisma.certificationQuestion.findUnique({
    where: { id: input.questionId },
    include: { options: true },
  });
  if (!question) throw new QuestionNotFoundError();

  const validOptionIds = new Set(question.options.map((option) => option.id));
  let answersToCreate: Omit<Prisma.AnswerCreateManyInput, 'attemptId' | 'questionId'>[];

  switch (question.type) {
    case 'MULTIPLE_CHOICE': {
      if (!input.optionId) throw new InvalidAnswerError('optionId is required for a MULTIPLE_CHOICE question');
      if (!validOptionIds.has(input.optionId)) {
        throw new InvalidAnswerError('optionId does not belong to this question');
      }
      answersToCreate = [{ optionId: input.optionId }];
      break;
    }
    case 'CHECKBOX': {
      if (!input.optionIds || input.optionIds.length === 0) {
        throw new InvalidAnswerError('optionIds is required for a CHECKBOX question');
      }
      for (const optionId of input.optionIds) {
        if (!validOptionIds.has(optionId)) {
          throw new InvalidAnswerError(`optionId ${optionId} does not belong to this question`);
        }
      }
      answersToCreate = input.optionIds.map((optionId) => ({ optionId }));
      break;
    }
    case 'SHORT_TEXT': {
      if (!input.textAnswer?.trim()) throw new InvalidAnswerError('textAnswer is required for a SHORT_TEXT question');
      answersToCreate = [{ textAnswer: input.textAnswer }];
      break;
    }
    case 'LIKERT_SCALE': {
      if (input.numericAnswer === undefined) {
        throw new InvalidAnswerError('numericAnswer is required for a LIKERT_SCALE question');
      }
      answersToCreate = [{ numericAnswer: input.numericAnswer }];
      break;
    }
  }

  return prisma.$transaction(async (tx) => {
    // Replace, don't accumulate — re-answering a question must not leave
    // stale rows behind (would corrupt scoring, especially for CHECKBOX).
    await tx.answer.deleteMany({ where: { attemptId, questionId: question.id } });
    await tx.answer.createMany({
      data: answersToCreate.map((answer) => ({ ...answer, attemptId, questionId: question.id })),
    });

    // Answer rows changing doesn't bump the parent's @updatedAt on its own —
    // this explicit touch is what lastActivityAt (save/resume, EXPIRED
    // transitions) actually relies on.
    await tx.certificationAttempt.update({ where: { id: attemptId }, data: { lastActivityAt: new Date() } });

    return tx.answer.findMany({
      where: { attemptId, questionId: question.id },
      select: answerSelect,
    });
  });
};
