import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@profils-actifs/shared';

/**
 * Query-string pagination, shared by every paginated list endpoint. Domain
 * B's profile feed is the first consumer; Domain D's recruiter catalogue
 * needs the exact same `page`/`limit` behaviour, so this schema is meant to
 * be imported and `.extend()`-ed (see `profile.ts`'s `feedQuerySchema`)
 * rather than re-implemented per domain.
 *
 * `z.coerce.number()` matters here specifically because it's a query
 * string: Express always hands `req.query` values back as strings (or
 * arrays of strings), never as numbers.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce
    .number()
    .int({ error: 'Le numéro de page doit être un entier' })
    .min(1, { error: 'Le numéro de page doit être supérieur ou égal à 1' })
    .default(1),
  limit: z.coerce
    .number()
    .int({ error: 'La limite doit être un entier' })
    .min(1, { error: 'La limite doit être supérieure ou égale à 1' })
    .max(MAX_PAGE_SIZE, { error: `La limite ne peut pas dépasser ${MAX_PAGE_SIZE}` })
    .default(DEFAULT_PAGE_SIZE),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
