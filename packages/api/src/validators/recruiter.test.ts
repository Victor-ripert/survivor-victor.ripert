import { catalogueQuerySchema } from './recruiter.js';

describe('catalogueQuerySchema', () => {
  it('defaults to the most recent profiles', () => {
    const result = catalogueQuerySchema.parse({});

    expect(result.sort).toBe('recent');
    expect(result.page).toBeUndefined();
  });

  it('coerces numeric query parameters', () => {
    const result = catalogueQuerySchema.parse({ page: '3', limit: '10', minScore: '65' });

    expect(result).toMatchObject({ page: 3, limit: 10, minScore: 65 });
  });

  it.each([
    ['true', true],
    ['1', true],
    ['false', false],
    ['0', false],
  ])('reads certifiedOnly=%s as %p', (raw, expected) => {
    expect(catalogueQuerySchema.parse({ certifiedOnly: raw }).certifiedOnly).toBe(expected);
  });

  it('rejects a boolean parameter that is neither true nor false', () => {
    expect(catalogueQuerySchema.safeParse({ hasVideo: 'maybe' }).success).toBe(false);
  });

  it('accepts a comma-separated skill list', () => {
    expect(catalogueQuerySchema.parse({ skills: 'React, SQL ,Node.js' }).skills).toEqual([
      'React',
      'SQL',
      'Node.js',
    ]);
  });

  it('accepts a repeated skill parameter', () => {
    expect(catalogueQuerySchema.parse({ skills: ['React', 'SQL'] }).skills).toEqual([
      'React',
      'SQL',
    ]);
  });

  it('drops empty entries from a skill list', () => {
    expect(catalogueQuerySchema.parse({ skills: 'React,,  ,SQL' }).skills).toEqual([
      'React',
      'SQL',
    ]);
  });

  it('trims free-text filters', () => {
    expect(catalogueQuerySchema.parse({ q: '  soudeur  ' }).q).toBe('soudeur');
  });

  it.each([
    ['page', { page: '0' }],
    ['limit', { limit: '-2' }],
    ['minScore', { minScore: '101' }],
  ])('rejects an out-of-range %s', (_name, query) => {
    expect(catalogueQuerySchema.safeParse(query).success).toBe(false);
  });

  it('ignores query parameters it does not know', () => {
    expect(catalogueQuerySchema.safeParse({ utm_source: 'newsletter' }).success).toBe(true);
  });
});
