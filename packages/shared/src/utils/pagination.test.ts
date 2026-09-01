import { buildPaginationMeta, resolvePageRequest } from './pagination.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants/pagination.js';

describe('resolvePageRequest', () => {
  it('defaults to the first page at the default size', () => {
    expect(resolvePageRequest()).toEqual({ page: 1, limit: DEFAULT_PAGE_SIZE, skip: 0 });
  });

  it('computes the offset from the requested page', () => {
    expect(resolvePageRequest(3, 10)).toEqual({ page: 3, limit: 10, skip: 20 });
  });

  it('caps the limit at the server-side maximum', () => {
    expect(resolvePageRequest(1, 500).limit).toBe(MAX_PAGE_SIZE);
  });

  it.each([0, -4, Number.NaN])('falls back to page 1 for %p', (page) => {
    expect(resolvePageRequest(page as number, 20).page).toBe(1);
  });

  it.each([0, -1, Number.NaN])('falls back to the default limit for %p', (limit) => {
    expect(resolvePageRequest(1, limit as number).limit).toBe(DEFAULT_PAGE_SIZE);
  });

  it('truncates fractional pages instead of rejecting them', () => {
    expect(resolvePageRequest(2.7, 5)).toEqual({ page: 2, limit: 5, skip: 5 });
  });
});

describe('buildPaginationMeta', () => {
  it('rounds the page count up', () => {
    expect(buildPaginationMeta(21, { page: 1, limit: 20 })).toEqual({
      page: 1,
      limit: 20,
      total: 21,
      pages: 2,
    });
  });

  it('reports zero pages for an empty result set', () => {
    expect(buildPaginationMeta(0, { page: 1, limit: 20 }).pages).toBe(0);
  });

  it('echoes an out-of-range page back without clamping it', () => {
    expect(buildPaginationMeta(5, { page: 99, limit: 20 })).toEqual({
      page: 99,
      limit: 20,
      total: 5,
      pages: 1,
    });
  });
});
