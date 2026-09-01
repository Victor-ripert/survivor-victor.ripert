import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { questionTypeRequiresOptions } from '../../validators/certification.js';
import type { CreateQuestionInput, UpdateQuestionInput } from '../../validators/certification.js';

// Thrown when an admin patch fails the "choice questions need >=2 options"
// rule against the *effective* type (existing DB value merged with the
// patch) — Zod alone can't check this on update since `type` may be absent.
export class InvalidOptionsError extends Error {
  constructor() {
    super('A choice question (MULTIPLE_CHOICE or CHECKBOX) requires at least 2 options');
    this.name = 'InvalidOptionsError';
  }
}

// Thrown when replacing a question's options would delete one that already
// has recorded Answer rows — the DB's FK blocks the delete, this just turns
// that into a readable domain error instead of a raw Prisma error code.
export class OptionsInUseError extends Error {
  constructor() {
    super('Cannot replace options for a question that has already been answered');
    this.name = 'OptionsInUseError';
  }
}

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
    select: { type: true },
  });
  if (!existing) return null;

  const effectiveType = input.type ?? existing.type;
  if (input.options && questionTypeRequiresOptions(effectiveType) && input.options.length < 2) {
    throw new InvalidOptionsError();
  }

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

      return tx.certificationQuestion.findUniqueOrThrow({
        where: { id },
        select: adminQuestionSelect,
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw new OptionsInUseError();
    }
    throw error;
  }
};
