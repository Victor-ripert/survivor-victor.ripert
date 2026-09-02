import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { questionTypeRequiresOptions } from '../../validators/certification.js';
import { conflict, unprocessableEntity } from '../../utils/http-error.js';
import type { CreateQuestionInput, UpdateQuestionInput } from '../../validators/certification.js';
import { invalidateInProgressAttempts } from './invalidation.js';

// Raised when an admin patch fails the "choice questions need >=2 options"
// rule against the *effective* type (existing DB value merged with the
// patch) — Zod alone can't check this on update since `type` may be absent.
// That database read is exactly what makes it a 422 rather than the 400 the
// create path returns, where the same rule is a plain schema refinement.
const invalidOptions = () =>
  unprocessableEntity(
    'Une question à choix (MULTIPLE_CHOICE ou CHECKBOX) requiert au moins 2 options',
  );

// Raised when replacing a question's options would delete one that already
// has recorded Answer rows — the DB's FK blocks the delete; this turns that
// into a readable message instead of a raw Prisma error code.
const optionsInUse = () =>
  conflict("Impossible de remplacer les options d'une question déjà répondue");

const publicOptionSelect = {
  id: true,
  text: true,
  order: true,
} satisfies Prisma.CertificationOptionSelect;

const publicQuestionSelect = {
  id: true,
  order: true,
  type: true,
  text: true,
  description: true,
  options: {
    select: publicOptionSelect,
    orderBy: { order: 'asc' },
  },
} satisfies Prisma.CertificationQuestionSelect;

// Points/weight/maxPoints/isActive are the "barème" — never expose them to
// the public endpoint, or a candidate can read the scoring off the network tab.
const adminOptionSelect = {
  id: true,
  text: true,
  points: true,
  order: true,
} satisfies Prisma.CertificationOptionSelect;

const adminQuestionSelect = {
  id: true,
  order: true,
  type: true,
  text: true,
  description: true,
  weight: true,
  maxPoints: true,
  isActive: true,
  options: {
    select: adminOptionSelect,
    orderBy: { order: 'asc' },
  },
} satisfies Prisma.CertificationQuestionSelect;

export const listPublicQuestions = () =>
  prisma.certificationQuestion.findMany({
    where: { isActive: true },
    select: publicQuestionSelect,
    orderBy: { order: 'asc' },
  });

export const listAdminQuestions = () =>
  prisma.certificationQuestion.findMany({
    select: adminQuestionSelect,
    orderBy: { order: 'asc' },
  });

export const createQuestion = (input: CreateQuestionInput) =>
  prisma.certificationQuestion.create({
    data: {
      order: input.order,
      type: input.type,
      text: input.text,
      description: input.description,
      weight: input.weight,
      maxPoints: input.maxPoints,
      options: input.options ? { create: input.options } : undefined,
    },
    select: adminQuestionSelect,
  });

export const updateQuestion = async (id: string, input: UpdateQuestionInput) => {
  const existing = await prisma.certificationQuestion.findUnique({
    where: { id },
    select: { type: true, isActive: true },
  });
  if (!existing) return null;

  const effectiveType = input.type ?? existing.type;
  if (input.options && questionTypeRequiresOptions(effectiveType) && input.options.length < 2) {
    throw invalidOptions();
  }

  // A question that was active, or becomes active, changes the scoring
  // surface (see scoreAttempt) for every candidate mid-session — whichever
  // side of the edit is active is what matters, not just the "before".
  const willBeActive = input.isActive ?? existing.isActive;
  const affectsScoring = existing.isActive || willBeActive;

  const { options, ...questionData } = input;

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.certificationQuestion.update({ where: { id }, data: questionData });

      if (options) {
        await tx.certificationOption.deleteMany({ where: { questionId: id } });
        await tx.certificationOption.createMany({
          data: options.map((option) => ({ ...option, questionId: id })),
        });
      }

      if (affectsScoring) {
        await invalidateInProgressAttempts(tx);
      }

      return tx.certificationQuestion.findUniqueOrThrow({
        where: { id },
        select: adminQuestionSelect,
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw optionsInUse();
    }
    throw error;
  }
};
