import { upsertProfileSchema, feedQuerySchema } from '../../src/validators/profile.js';

describe('upsertProfileSchema', () => {
  it('accepts a minimal valid payload (location + sector only)', () => {
    const parsed = upsertProfileSchema.safeParse({
      location: 'Paris',
      sector: 'Informatique',
    });
    expect(parsed.success).toBe(true);
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

  it('rejects a missing location', () => {
    const parsed = upsertProfileSchema.safeParse({ sector: 'Informatique' });
    expect(parsed.success).toBe(false);
  });

  it('rejects a missing sector', () => {
    const parsed = upsertProfileSchema.safeParse({ location: 'Paris' });
    expect(parsed.success).toBe(false);
  });

  it('rejects a headline over 120 characters', () => {
    const parsed = upsertProfileSchema.safeParse({
      location: 'Paris',
      sector: 'Informatique',
      headline: 'a'.repeat(121),
    });
    expect(parsed.success).toBe(false);
  });
});

describe('feedQuerySchema', () => {
  it('accepts an empty query, filling in pagination defaults', () => {
    const parsed = feedQuerySchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.page).toBe(1);
      expect(parsed.data.limit).toBe(20);
    }
  });

  it('accepts a valid certificationStatus filter', () => {
    const parsed = feedQuerySchema.safeParse({ certificationStatus: 'COMPLETED' });
    expect(parsed.success).toBe(true);
  });

  it('rejects an invalid certificationStatus value', () => {
    const parsed = feedQuerySchema.safeParse({ certificationStatus: 'NOT_A_REAL_STATUS' });
    expect(parsed.success).toBe(false);
  });

  it('still enforces the inherited pagination cap', () => {
    const parsed = feedQuerySchema.safeParse({ limit: '999' });
    expect(parsed.success).toBe(false);
  });
});
