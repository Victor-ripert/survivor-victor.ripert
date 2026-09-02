import type { CertificationLevel } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { internalError } from '../../utils/http-error.js';

export const resolveBadgeLevel = async (score: number): Promise<CertificationLevel> => {
  const level = await prisma.certificationLevel.findFirst({
    where: { isActive: true, minScore: { lte: score }, maxScore: { gte: score } },
    orderBy: { order: 'asc' },
  });
  // A gap in the CertificationLevel bands (see the seed's "must be contiguous
  // 0-100" comment) is a configuration error, not a valid "no badge" outcome —
  // surfacing it loudly beats silently certifying nobody.
  if (!level) throw internalError(`Aucun niveau de certification configuré pour le score ${score}`);
  return level;
};

// The lowest tier ("Non certifié" in the seed) has no badgeIconUrl — that's
// the signal for "attempt completed but nothing was actually earned".
export const isBadgeEarned = (level: CertificationLevel): boolean => level.badgeIconUrl !== null;
