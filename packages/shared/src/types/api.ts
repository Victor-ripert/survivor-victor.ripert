/** Uniform envelopes every endpoint answers with. */

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * The complete set of `error` codes any endpoint answers with. The frontend
 * branches on these, so a handler never invents one inline.
 *
 * `validation_error` (400) and `unprocessable_entity` (422) split on whether
 * the request could be interpreted at all: 400 is decided by reading the
 * request on its own (malformed JSON, wrong shape, out-of-range primitive),
 * 422 needs a database read — the payload is well formed but contradicts the
 * state or the type of the resource it targets.
 */
export type ApiErrorCode =
  | 'validation_error'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'unprocessable_entity'
  | 'conflict'
  | 'too_many_requests'
  | 'internal_error';

export interface ApiErrorResponse {
  error: ApiErrorCode;
  message: string;
  statusCode: number;
}
