import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import type { SubmitAnswerInput } from '../../validators/certification.js';
import { conflict, notFound, unprocessableEntity } from '../../utils/http-error.js';
import { attemptForbidden, attemptNotFound } from './attempts.js';

export const attemptNotInProgress = () => conflict("Cette tentative n'est plus en cours");

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
  if (!attempt) throw attemptNotFound();
  if (attempt.userId !== userId) throw attemptForbidden();
  if (attempt.status !== 'IN_PROGRESS') throw attemptNotInProgress();

  const question = await prisma.certificationQuestion.findUnique({
    where: { id: input.questionId },
    include: { options: true },
  });
  if (!question) throw notFound('Question de certification introuvable');

  const validOptionIds = new Set(question.options.map((option) => option.id));
  let answersToCreate: Omit<Prisma.AnswerCreateManyInput, 'attemptId' | 'questionId'>[];

  // 422, not 400: submitAnswerSchema already accepted the payload's shape, and
  // which field is actually required only becomes knowable once the question's
  // real type has been read back from the database.
  switch (question.type) {
    case 'MULTIPLE_CHOICE': {
      if (!input.optionId) {
        throw unprocessableEntity('optionId est requis pour une question MULTIPLE_CHOICE');
      }
      if (!validOptionIds.has(input.optionId)) {
        throw unprocessableEntity("optionId n'appartient pas à cette question");
      }
      answersToCreate = [{ optionId: input.optionId }];
      break;
    }
    case 'CHECKBOX': {
      if (!input.optionIds || input.optionIds.length === 0) {
        throw unprocessableEntity('optionIds est requis pour une question CHECKBOX');
      }
      for (const optionId of input.optionIds) {
        if (!validOptionIds.has(optionId)) {
          throw unprocessableEntity(`optionId ${optionId} n'appartient pas à cette question`);
        }
      }
      answersToCreate = input.optionIds.map((optionId) => ({ optionId }));
      break;
    }
    case 'SHORT_TEXT': {
      if (!input.textAnswer?.trim()) {
        throw unprocessableEntity('textAnswer est requis pour une question SHORT_TEXT');
      }
      answersToCreate = [{ textAnswer: input.textAnswer }];
      break;
    }
    case 'LIKERT_SCALE': {
      if (input.numericAnswer === undefined) {
        throw unprocessableEntity('numericAnswer est requis pour une question LIKERT_SCALE');
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
    await tx.certificationAttempt.update({
      where: { id: attemptId },
      data: { lastActivityAt: new Date() },
    });

    return tx.answer.findMany({
      where: { attemptId, questionId: question.id },
      select: answerSelect,
    });
  });
};
