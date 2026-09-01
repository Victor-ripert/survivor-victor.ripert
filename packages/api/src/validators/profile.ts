import { z } from 'zod';
import { CERTIFICATION_STATUSES } from '@profils-actifs/shared';
import { paginationQuerySchema } from './pagination.js';

/**
 * Payload for `POST /profiles/me` (create-or-update, applicant only).
 * Matches `openapi.yaml`'s current contract exactly: `location`/`sector`
 * required, `headline`/`bio` optional. Deliberately has no `skills` field —
 * that endpoint doesn't exist yet (tracked as issue #7); adding it here
 * ahead of the contract would let the backend accept a payload the
 * documented API doesn't, which is exactly the kind of drift the
 * contract-first rule in CLAUDE.md exists to prevent.
 */
export const upsertProfileSchema = z.object({
  headline: z
    .string()
    .max(120, { error: 'Le titre ne peut pas dépasser 120 caractères' })
    .optional(),
  bio: z
    .string()
    .max(2000, { error: 'La bio ne peut pas dépasser 2000 caractères' })
    .optional(),
  location: z.string().min(1, { error: 'Localisation requise' }),
  sector: z.string().min(1, { error: 'Secteur requis' }),
});

export type UpsertProfileInput = z.infer<typeof upsertProfileSchema>;

/**
 * Query params for `GET /profiles` (the public feed). Extends the shared
 * pagination schema instead of redeclaring `page`/`limit` — this is the
 * schema Domain D's recruiter catalogue extends further with its own
 * filters, not a copy of it.
 */
export const feedQuerySchema = paginationQuerySchema.extend({
  sector: z.string().min(1, { error: 'Secteur invalide' }).optional(),
  location: z.string().min(1, { error: 'Localisation invalide' }).optional(),
  certificationStatus: z
    .enum(CERTIFICATION_STATUSES, { error: 'Statut de certification invalide' })
    .optional(),
});

export type FeedQuery = z.infer<typeof feedQuerySchema>;
