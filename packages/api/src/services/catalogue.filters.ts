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

/**
 * Videos a recruiter — or the public — is allowed to see: approved ones, and
 * nothing else.
 *
 * This is deliberately stricter than `visibleProfileFilter` above, and the
 * asymmetry is the point. A profile awaiting review stays listed, because a
 * moderation backlog must not silently hide a job-seeker who opted in. A video
 * awaiting review does not, because §7.9.2 of the addendum makes moderation
 * *a priori*: the ministry answers for a video from the moment it is online,
 * so nothing is online before someone approved it.
 *
 * It used to read `{ not: REJECTED }`, which let a PENDING video through — its
 * URL was served in `previewVideo`, it counted in `videoCount`, and it matched
 * `hasVideo`. See docs/preuves/SOIR-2-video-en-attente.txt for the before and
 * after on the same row.
 */
export const publishedVideoFilter: Prisma.VideoWhereInput = {
  moderationStatus: ModerationStatus.APPROVED,
};

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
