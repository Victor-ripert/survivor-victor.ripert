import type { Prisma } from '@prisma/client';
import type { CatalogueSort } from '@profils-actifs/shared';
import { publishedVideoFilter, visibleProfileFilter } from './visibility.js';

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

export { publishedVideoFilter, visibleProfileFilter };

const insensitive = (value: string): Prisma.StringFilter => ({
  contains: value,
  mode: 'insensitive',
});

/**
 * Free text, restricted to what the candidate wrote about their work.
 *
 * `user.firstName` and `user.lastName` used to be part of this OR and were
 * removed: a surname is a documented proxy for origin, and a catalogue that
 * lets a recruiter narrow the population by name offers a selection criterion
 * that Art. L1132-1 of the Code du travail does not allow. Looking up a
 * candidate already known by name is a real need, but it is a different
 * feature from browsing the catalogue and it does not justify exposing the
 * filter here. See docs/livrables/note-criteres-de-filtrage.md.
 */
const searchFilter = (term: string): Prisma.ProfileWhereInput => ({
  OR: [
    { headline: insensitive(term) },
    { bio: insensitive(term) },
    { sector: insensitive(term) },
    { location: insensitive(term) },
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
 * show the same profile twice and skip another. `id` is unique and never
 * reused, so appending it makes each ordering *total*: no two rows compare
 * equal, and the sequence a walk produces is a function of the data alone,
 * not of the plan Postgres happened to pick.
 *
 * The rule is not "add a tiebreaker where ties look likely" — `certificationScore`
 * is an integer over a hundred values and `sector` is drawn from a short list,
 * so ties are the norm there, but even `updatedAt` collides whenever two
 * profiles are written in the same millisecond. Two columns, always.
 *
 * Enforced by the unit tests in catalogue.filters.test.ts and demonstrated
 * end-to-end by scripts/preuves/tri-deterministe.sh.
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
    case 'sector':
      return [{ sector: 'asc' }, { updatedAt: 'desc' }, { id: 'asc' }];
    case 'location':
      return [{ location: 'asc' }, { updatedAt: 'desc' }, { id: 'asc' }];
    case 'recent':
      return [{ updatedAt: 'desc' }, { id: 'asc' }];
  }
};
