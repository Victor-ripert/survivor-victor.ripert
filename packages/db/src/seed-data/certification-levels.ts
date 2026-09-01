import type { Prisma } from '@prisma/client';

// Score bands must stay contiguous and cover 0-100 with no gap or overlap —
// the badge-resolution step (score -> CertificationLevel) assumes every
// possible score matches exactly one level.
export const certificationLevels: Prisma.CertificationLevelCreateInput[] = [
  {
    name: 'Non certifié',
    minScore: 0,
    maxScore: 39,
    order: 0,
  },
  {
    name: 'Certifié JEB',
    minScore: 40,
    maxScore: 69,
    badgeIconUrl: '/badges/jeb-certifie.svg',
    order: 1,
  },
  {
    name: 'Certifié JEB Confirmé',
    minScore: 70,
    maxScore: 89,
    badgeIconUrl: '/badges/jeb-confirme.svg',
    order: 2,
  },
  {
    name: 'Certifié JEB Expert',
    minScore: 90,
    maxScore: 100,
    badgeIconUrl: '/badges/jeb-expert.svg',
    order: 3,
  },
];
