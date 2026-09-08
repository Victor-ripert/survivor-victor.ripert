import { CATALOGUE_DEFAULT_SORT, CATALOGUE_SORTS } from '@profils-actifs/shared';
import {
  buildCatalogueOrderBy,
  buildCatalogueWhere,
  publishedVideoFilter,
} from './catalogue.filters.js';

const conditions = (where: ReturnType<typeof buildCatalogueWhere>) =>
  (where.AND ?? []) as Record<string, unknown>[];

describe('buildCatalogueWhere', () => {
  it('always excludes rejected profiles and inactive or non-applicant accounts', () => {
    expect(conditions(buildCatalogueWhere({}))[0]).toEqual({
      moderationStatus: { not: 'REJECTED' },
      user: { isActive: true, role: 'APPLICANT' },
    });
  });

  it('adds nothing but the visibility rule when no filter is supplied', () => {
    expect(conditions(buildCatalogueWhere({}))).toHaveLength(1);
  });

  it('searches across the profile and its skills', () => {
    const [, search] = conditions(buildCatalogueWhere({ q: 'soudure' }));
    const clauses = search.OR as Record<string, unknown>[];

    expect(clauses).toContainEqual({ headline: { contains: 'soudure', mode: 'insensitive' } });
    expect(clauses).toContainEqual({
      skills: { some: { skill: { name: { contains: 'soudure', mode: 'insensitive' } } } },
    });
  });

  // Art. L1132-1: a surname is a proxy for origin, so it is not a criterion a
  // recruiter may narrow the catalogue by.
  it('never matches on the candidate`s name', () => {
    const [, search] = conditions(buildCatalogueWhere({ q: 'soudure' }));
    const clauses = search.OR as Record<string, unknown>[];

    expect(JSON.stringify(clauses)).not.toContain('firstName');
    expect(JSON.stringify(clauses)).not.toContain('lastName');
  });

  it('requires every requested skill rather than any of them', () => {
    const clauses = conditions(buildCatalogueWhere({ skills: ['React', 'SQL'] }));

    expect(clauses).toHaveLength(3);
    expect(clauses.slice(1)).toEqual([
      { skills: { some: { skill: { name: { equals: 'React', mode: 'insensitive' } } } } },
      { skills: { some: { skill: { name: { equals: 'SQL', mode: 'insensitive' } } } } },
    ]);
  });

  it('matches sector and location case-insensitively but exactly', () => {
    const clauses = conditions(buildCatalogueWhere({ sector: 'Industrie', location: 'Lille' }));

    expect(clauses).toContainEqual({ sector: { equals: 'Industrie', mode: 'insensitive' } });
    expect(clauses).toContainEqual({ location: { equals: 'Lille', mode: 'insensitive' } });
  });

  it('keeps a zero minimum score, which is a real filter and not an absent one', () => {
    expect(conditions(buildCatalogueWhere({ minScore: 0 }))).toContainEqual({
      certificationScore: { gte: 0 },
    });
  });

  // §7.9.2: moderation is a priori. A video awaiting review is not "not yet
  // rejected", it is simply not published, and `hasVideo` must not surface a
  // profile on the strength of one.
  it('only counts videos moderation has approved', () => {
    expect(conditions(buildCatalogueWhere({ hasVideo: true }))).toContainEqual({
      videos: { some: { moderationStatus: 'APPROVED' } },
    });
  });

  it('ignores falsy toggles instead of filtering on them', () => {
    expect(conditions(buildCatalogueWhere({ certifiedOnly: false, hasVideo: false }))).toHaveLength(
      1,
    );
  });

  it('narrows to an explicit set of applicants for the favourites view', () => {
    expect(conditions(buildCatalogueWhere({ restrictToUserIds: ['a', 'b'] }))).toContainEqual({
      userId: { in: ['a', 'b'] },
    });
  });

  it('narrows to nothing when the favourites set is empty', () => {
    expect(conditions(buildCatalogueWhere({ restrictToUserIds: [] }))).toContainEqual({
      userId: { in: [] },
    });
  });
});

describe('publishedVideoFilter', () => {
  it('admits approved videos only', () => {
    expect(publishedVideoFilter).toEqual({ moderationStatus: 'APPROVED' });
  });

  it.each([['PENDING'], ['REJECTED']])('keeps a %s video out', (status) => {
    expect(publishedVideoFilter).not.toEqual({ moderationStatus: status });
    expect(JSON.stringify(publishedVideoFilter)).not.toContain('not');
  });
});

describe('buildCatalogueOrderBy', () => {
  // Iterating CATALOGUE_SORTS rather than a hand-written list is the point:
  // a sort added to the vocabulary without a tiebreaker fails here instead of
  // shipping a catalogue that pages inconsistently.
  it.each(CATALOGUE_SORTS)('ends %s ordering on the id', (sort) => {
    expect(buildCatalogueOrderBy(sort).at(-1)).toEqual({ id: 'asc' });
  });

  it.each(CATALOGUE_SORTS)('orders %s on at least two columns', (sort) => {
    expect(buildCatalogueOrderBy(sort).length).toBeGreaterThanOrEqual(2);
  });

  it('never repeats a column within one ordering', () => {
    for (const sort of CATALOGUE_SORTS) {
      const columns = buildCatalogueOrderBy(sort).map((entry) => Object.keys(entry)[0]);

      expect(new Set(columns).size).toBe(columns.length);
    }
  });

  it('defaults to the freshest profiles first', () => {
    expect(buildCatalogueOrderBy(CATALOGUE_DEFAULT_SORT)).toEqual([
      { updatedAt: 'desc' },
      { id: 'asc' },
    ]);
  });

  it('ranks unscored profiles last rather than first', () => {
    expect(buildCatalogueOrderBy('score')[0]).toEqual({
      certificationScore: { sort: 'desc', nulls: 'last' },
    });
  });

  it('orders sector and location alphabetically, freshest first within a value', () => {
    expect(buildCatalogueOrderBy('sector')).toEqual([
      { sector: 'asc' },
      { updatedAt: 'desc' },
      { id: 'asc' },
    ]);
    expect(buildCatalogueOrderBy('location')).toEqual([
      { location: 'asc' },
      { updatedAt: 'desc' },
      { id: 'asc' },
    ]);
  });

  // Courriel du 8 septembre 2026: the orderings offered to a recruiter rest on
  // professional criteria only. A candidate's name is not one of them, and no
  // audience measurement — even a derived one — may reach the ORDER BY.
  it('never orders people by their name', () => {
    for (const sort of CATALOGUE_SORTS) {
      const rendered = JSON.stringify(buildCatalogueOrderBy(sort));

      expect(rendered).not.toContain('firstName');
      expect(rendered).not.toContain('lastName');
    }
  });

  it('orders on declared professional attributes and nothing else', () => {
    const allowed = ['updatedAt', 'certificationScore', 'sector', 'location', 'id'];

    for (const sort of CATALOGUE_SORTS) {
      for (const entry of buildCatalogueOrderBy(sort)) {
        expect(allowed).toContain(Object.keys(entry)[0]);
      }
    }
  });
});
