import type { PaginationMeta } from '../types/api.js';
import { DEFAULT_PAGE_SIZE, FIRST_PAGE, MAX_PAGE_SIZE } from '../constants/pagination.js';

export interface PageRequest {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Clamps a client-supplied page/limit pair into a range the database can
 * safely execute. Non-finite, negative and oversized values all collapse onto
 * the defaults rather than erroring: an out-of-range page is a legitimate
 * request that simply yields an empty page.
 */
export const resolvePageRequest = (page?: number, limit?: number): PageRequest => {
  const safePage = Number.isFinite(page) && page! >= FIRST_PAGE ? Math.floor(page!) : FIRST_PAGE;
  const safeLimit =
    Number.isFinite(limit) && limit! >= 1
      ? Math.min(Math.floor(limit!), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  return { page: safePage, limit: safeLimit, skip: (safePage - FIRST_PAGE) * safeLimit };
};

/** `pages` is 0 for an empty result set, so a client can tell "no matches"
 *  apart from "one page of matches". */
export const buildPaginationMeta = (
  total: number,
  { page, limit }: Pick<PageRequest, 'page' | 'limit'>,
): PaginationMeta => ({
  page,
  limit,
  total,
  pages: total === 0 ? 0 : Math.ceil(total / limit),
});
