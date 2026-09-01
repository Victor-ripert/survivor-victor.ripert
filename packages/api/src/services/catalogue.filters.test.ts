import { buildCatalogueOrderBy, buildCatalogueWhere } from './catalogue.filters.js';

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

  it('searches across the profile, its owner and its skills', () => {
    const [, search] = conditions(buildCatalogueWhere({ q: 'soudure' }));
    const clauses = search.OR as Record<string, unknown>[];

    expect(clauses).toContainEqual({ headline: { contains: 'soudure', mode: 'insensitive' } });
    expect(clauses).toContainEqual({
      user: { lastName: { contains: 'soudure', mode: 'insensitive' } },
    });
    expect(clauses).toContainEqual({
      skills: { some: { skill: { name: { contains: 'soudure', mode: 'insensitive' } } } },
    });
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

  it('only counts videos that moderation has not rejected', () => {
    expect(conditions(buildCatalogueWhere({ hasVideo: true }))).toContainEqual({
      videos: { some: { moderationStatus: { not: 'REJECTED' } } },
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

describe('buildCatalogueOrderBy', () => {
  it.each(['recent', 'score', 'name'] as const)('ends %s ordering on the id', (sort) => {
    const orderBy = buildCatalogueOrderBy(sort);

    expect(orderBy.at(-1)).toEqual({ id: 'asc' });
  });

  it('ranks unscored profiles last rather than first', () => {
    expect(buildCatalogueOrderBy('score')[0]).toEqual({
      certificationScore: { sort: 'desc', nulls: 'last' },
    });
  });

  it('sorts people by last name then first name', () => {
    expect(buildCatalogueOrderBy('name').slice(0, 2)).toEqual([
      { user: { lastName: 'asc' } },
      { user: { firstName: 'asc' } },
    ]);
  });
});
