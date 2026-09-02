import { MAX_PAGE_SIZE } from '@profils-actifs/shared';
import type { PaginationMeta } from '@profils-actifs/shared';
import type { PaginationQuery } from '../validators/pagination.js';

/**
 * The skip/take math every paginated query needs (`profile.service.ts`'s
 * feed, `moderation.service.ts`'s admin queue, and whatever Domain D's
 * recruiter catalogue adds next) — computed once here instead of
 * recomputed slightly differently in each service.
 *
 * `limit` is re-clamped to `MAX_PAGE_SIZE` here as a second, defensive
 * line of enforcement on top of the validator — the 20/page cap is a
 * data-model invariant (see CLAUDE.md), not just a validator detail, so it
 * holds even if some future caller builds a `PaginationQuery` by hand
 * instead of through `paginationQuerySchema`.
 */
export interface PageWindow {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

export function resolvePageWindow(pagination: PaginationQuery): PageWindow {
  const limit = Math.min(pagination.limit, MAX_PAGE_SIZE);
  const page = pagination.page;
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

/** Pairs a `PageWindow` with the query's real total to build the response's `pagination` block. */
export function toPaginationMeta(window: PageWindow, total: number): PaginationMeta {
  return {
    page: window.page,
    limit: window.limit,
    total,
    pages: Math.ceil(total / window.limit),
  };
}
