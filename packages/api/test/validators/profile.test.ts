import {
  addSkillSchema,
  feedQuerySchema,
  upsertProfileSchema,
} from '../../src/validators/profile.js';

describe('upsertProfileSchema', () => {
  it('accepts a minimal valid payload (location + sector only)', () => {
    expect(
      upsertProfileSchema.safeParse({ location: 'Paris', sector: 'Informatique' }).success,
    ).toBe(true);
  });

  it('accepts a full payload', () => {
    const parsed = upsertProfileSchema.safeParse({
      headline: 'Développeuse full-stack',
      bio: "Trois ans d'expérience en React et Node.js.",
      location: 'Lyon',
      sector: 'Informatique',
    });
    expect(parsed.success).toBe(true);
  });

  it('keeps a blank headline so the service can clear the stored one', () => {
    const parsed = upsertProfileSchema.parse({ headline: '  ', location: 'Lyon', sector: 'IT' });
    expect(parsed.headline).toBe('');
  });

  it.each([
    ['location', { sector: 'Informatique' }],
    ['sector', { location: 'Paris' }],
  ])('rejects a missing %s', (_field, payload) => {
    expect(upsertProfileSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects a headline over 120 characters', () => {
    const parsed = upsertProfileSchema.safeParse({
      location: 'Paris',
      sector: 'Informatique',
      headline: 'a'.repeat(121),
    });
    expect(parsed.success).toBe(false);
  });

  it('trims free text', () => {
    expect(upsertProfileSchema.parse({ location: '  Lyon ', sector: 'IT' }).location).toBe('Lyon');
  });
});

describe('addSkillSchema', () => {
  it('defaults the level to INTERMEDIATE', () => {
    expect(addSkillSchema.parse({ skillName: 'React' }).level).toBe('INTERMEDIATE');
  });

  it('rejects an unknown level', () => {
    expect(addSkillSchema.safeParse({ skillName: 'React', level: 'GURU' }).success).toBe(false);
  });

  it('rejects a blank name', () => {
    expect(addSkillSchema.safeParse({ skillName: '   ' }).success).toBe(false);
  });
});

describe('feedQuerySchema', () => {
  it('accepts an empty query', () => {
    expect(feedQuerySchema.safeParse({}).success).toBe(true);
  });

  it('coerces page and limit from the query string', () => {
    expect(feedQuerySchema.parse({ page: '3', limit: '10' })).toEqual({ page: 3, limit: 10 });
  });

  it('exposes no selection criterion on the public feed', () => {
    const parsed = feedQuerySchema.parse({
      sector: 'Informatique',
      certificationStatus: 'COMPLETED',
    });
    expect(parsed).toEqual({});
  });

  it('rejects a page that is not a positive integer', () => {
    expect(feedQuerySchema.safeParse({ page: '0' }).success).toBe(false);
    expect(feedQuerySchema.safeParse({ page: 'abc' }).success).toBe(false);
  });
});
