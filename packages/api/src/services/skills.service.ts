import { Prisma } from '@prisma/client';
import type { Skill } from '@profils-actifs/shared';
import { prisma } from '../config/prisma.js';

const skillSelect = { id: true, name: true } satisfies Prisma.SkillSelect;

/** The shared catalog, for the profile form's suggestions and the catalogue facets. */
export const listSkills = (): Promise<Skill[]> =>
  prisma.skill.findMany({ select: skillSelect, orderBy: { name: 'asc' } });

const normalizeSkillName = (raw: string): string => raw.trim().replace(/\s+/g, ' ');

/**
 * Skills are matched by name, case-insensitively, so "react" and "React" tag
 * the same catalog entry instead of creating a near-duplicate that would split
 * the recruiter's skill filter in two.
 */
export const findOrCreateSkill = async (
  tx: Prisma.TransactionClient,
  rawName: string,
): Promise<Skill> => {
  const name = normalizeSkillName(rawName);
  const findExisting = () =>
    tx.skill.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: skillSelect,
    });

  const existing = await findExisting();
  if (existing) return existing;

  try {
    return await tx.skill.create({ data: { name }, select: skillSelect });
  } catch (error: unknown) {
    // `Skill.name` is unique, so two candidates tagging the same new skill at
    // once means one create loses the race. The loser wants the winner's row,
    // not a 409 — the skill it asked for now exists, which is all it needed.
    const isDuplicate =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
    if (!isDuplicate) throw error;

    const winner = await findExisting();
    if (!winner) throw error;

    return winner;
  }
};
