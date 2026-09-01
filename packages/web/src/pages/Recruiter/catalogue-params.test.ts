import { countActiveFilters, parseCatalogueParams, toCatalogueParams } from './catalogue-params.js';

const parse = (search: string) => parseCatalogueParams(new URLSearchParams(search));

describe('parseCatalogueParams', () => {
  it('falls back to the first page sorted by recency', () => {
    expect(parse('')).toEqual({
      page: 1,
      q: undefined,
      sector: undefined,
      location: undefined,
      skills: undefined,
      certifiedOnly: undefined,
      minScore: undefined,
      hasVideo: undefined,
      sort: 'recent',
    });
  });

  it('reads every filter from the query string', () => {
    expect(
      parse(
        'page=3&q=react&sector=Informatique&location=Lyon&skills=React,SQL&certifiedOnly=true&minScore=65&hasVideo=true&sort=score',
      ),
    ).toMatchObject({
      page: 3,
      q: 'react',
      sector: 'Informatique',
      location: 'Lyon',
      skills: ['React', 'SQL'],
      certifiedOnly: true,
      minScore: 65,
      hasVideo: true,
      sort: 'score',
    });
  });

  it('ignores an unknown sort rather than forwarding it to the API', () => {
    expect(parse('sort=popularity').sort).toBe('recent');
  });

  it('ignores a non-numeric page', () => {
    expect(parse('page=abc').page).toBe(1);
  });

  it('drops empty entries from a skill list', () => {
    expect(parse('skills=React,,SQL').skills).toEqual(['React', 'SQL']);
  });

  it('treats any value other than true as an unset toggle', () => {
    expect(parse('certifiedOnly=yes').certifiedOnly).toBeUndefined();
  });
});

describe('toCatalogueParams', () => {
  it('keeps a pristine catalogue out of the URL', () => {
    expect(toCatalogueParams({ page: 1, sort: 'recent' }).toString()).toBe('');
  });

  it('writes only the filters that are set', () => {
    const params = toCatalogueParams({ page: 2, q: 'soudeur', skills: ['Soudure'], sort: 'name' });

    expect(params.get('page')).toBe('2');
    expect(params.get('q')).toBe('soudeur');
    expect(params.get('skills')).toBe('Soudure');
    expect(params.get('sort')).toBe('name');
    expect(params.get('sector')).toBeNull();
  });

  it('round-trips a filtered view', () => {
    const query = {
      page: 4,
      q: 'react',
      sector: 'Informatique',
      location: 'Lyon',
      skills: ['React', 'SQL'],
      certifiedOnly: true,
      minScore: 80,
      hasVideo: true,
      sort: 'score' as const,
    };

    expect(parseCatalogueParams(toCatalogueParams(query))).toMatchObject(query);
  });
});

describe('countActiveFilters', () => {
  it('counts nothing on a pristine query', () => {
    expect(countActiveFilters({ page: 1, sort: 'recent' })).toBe(0);
  });

  it('counts each active filter once, sorting and paging excluded', () => {
    expect(
      countActiveFilters({
        page: 3,
        sort: 'score',
        q: 'react',
        skills: ['React', 'SQL'],
        certifiedOnly: true,
      }),
    ).toBe(3);
  });

  it('does not count a disabled toggle', () => {
    expect(countActiveFilters({ certifiedOnly: false, hasVideo: false })).toBe(0);
  });
});
