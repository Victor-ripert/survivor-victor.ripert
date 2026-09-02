/**
 * Generic pagination contract, reused by every paginated list in the API
 * (the profile feed today, the recruiter catalogue later) so the shape only
 * has to be defined once. Matches CLAUDE.md's documented response shape:
 * `{ data: [...], pagination: { page, limit, total, pages } }`.
 */

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: PaginationMeta;
}

/** Query-side input — what a caller sends, not what the server returns. */
export interface PaginationParams {
  page?: number;
  limit?: number;
}
