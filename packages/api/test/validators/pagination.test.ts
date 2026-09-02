import { paginationQuerySchema } from '../../src/validators/pagination.js';

describe('paginationQuerySchema', () => {
  it('defaults page to 1 and limit to 20 when both are omitted', () => {
    const parsed = paginationQuerySchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.page).toBe(1);
      expect(parsed.data.limit).toBe(20);
    }
  });

  it('coerces valid numeric query strings into numbers', () => {
    const parsed = paginationQuerySchema.safeParse({ page: '3', limit: '10' });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.page).toBe(3);
      expect(parsed.data.limit).toBe(10);
    }
  });

  it('rejects a limit above the 20/page cap', () => {
    const parsed = paginationQuerySchema.safeParse({ limit: '21' });
    expect(parsed.success).toBe(false);
  });

  it('rejects a page below 1', () => {
    const parsed = paginationQuerySchema.safeParse({ page: '0' });
    expect(parsed.success).toBe(false);
  });

  it('rejects a non-numeric page', () => {
    const parsed = paginationQuerySchema.safeParse({ page: 'not-a-number' });
    expect(parsed.success).toBe(false);
  });
});
