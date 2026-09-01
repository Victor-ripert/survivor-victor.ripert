import { ModerationStatus, Prisma, UserRole } from '@prisma/client';
import type { CatalogueSort } from '@profils-actifs/shared';

export interface CatalogueFilters {
  q?: string;
  sector?: string;
  location?: string;
  skills?: string[];
  certifiedOnly?: boolean;
  minScore?: number;
  hasVideo?: boolean;
  /** Restricts the result set to these applicant user ids (favourites view). */
  restrictToUserIds?: string[];
}

/**
 * Profiles a recruiter is allowed to see: an active job-seeker account whose
 * profile has not been rejected by moderation. Profiles still awaiting review
 * stay visible — the platform is opt-in for job-seekers and a moderation
 * backlog must not silently hide them — while a rejected profile disappears
 * from every recruiter-facing surface.
 */
export const visibleProfileFilter: Prisma.ProfileWhereInput = {
  moderationStatus: { not: ModerationStatus.REJECTED },
  user: { isActive: true, role: UserRole.APPLICANT },
};

export const publishedVideoFilter: Prisma.VideoWhereInput = {
  moderationStatus: { not: ModerationStatus.REJECTED },
};

const insensitive = (value: string): Prisma.StringFilter => ({
  contains: value,
  mode: 'insensitive',
});

const searchFilter = (term: string): Prisma.ProfileWhereInput => ({
  OR: [
    { headline: insensitive(term) },
    { bio: insensitive(term) },
    { sector: insensitive(term) },
    { location: insensitive(term) },
    { user: { firstName: insensitive(term) } },
    { user: { lastName: insensitive(term) } },
    { skills: { some: { skill: { name: insensitive(term) } } } },
  ],
});

/** Every requested skill must be present, not just one of them: a recruiter
 *  narrowing by "React" *and* "TypeScript" is describing one candidate, not
 *  two populations. */
const skillFilters = (skills: string[]): Prisma.ProfileWhereInput[] =>
  skills.map((name) => ({
    skills: { some: { skill: { name: { equals: name, mode: 'insensitive' } } } },
  }));

export const buildCatalogueWhere = (filters: CatalogueFilters): Prisma.ProfileWhereInput => {
  const and: Prisma.ProfileWhereInput[] = [visibleProfileFilter];

  if (filters.q) and.push(searchFilter(filters.q));
  if (filters.sector) and.push({ sector: { equals: filters.sector, mode: 'insensitive' } });
  if (filters.location) and.push({ location: { equals: filters.location, mode: 'insensitive' } });
  if (filters.skills?.length) and.push(...skillFilters(filters.skills));
  if (filters.certifiedOnly) and.push({ certificationStatus: 'COMPLETED' });
  if (filters.minScore !== undefined) and.push({ certificationScore: { gte: filters.minScore } });
  if (filters.hasVideo) and.push({ videos: { some: publishedVideoFilter } });
  if (filters.restrictToUserIds) and.push({ userId: { in: filters.restrictToUserIds } });

  return { AND: and };
};

/**
 * Every ordering ends on the primary key so that two profiles sharing a sort
 * value keep a stable relative position across pages — without it, paging can
 * show the same profile twice and skip another.
 */
export const buildCatalogueOrderBy = (
  sort: CatalogueSort,
): Prisma.ProfileOrderByWithRelationInput[] => {
  switch (sort) {
    case 'score':
      return [
        { certificationScore: { sort: 'desc', nulls: 'last' } },
        { updatedAt: 'desc' },
        { id: 'asc' },
      ];
    case 'name':
      return [{ user: { lastName: 'asc' } }, { user: { firstName: 'asc' } }, { id: 'asc' }];
    case 'recent':
      return [{ updatedAt: 'desc' }, { id: 'asc' }];
  }
};
