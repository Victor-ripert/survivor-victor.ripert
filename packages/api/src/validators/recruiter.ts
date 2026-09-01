import { z } from 'zod';
import {
  CATALOGUE_MAX_SKILL_FILTERS,
  CATALOGUE_SEARCH_MAX_LENGTH,
  CATALOGUE_SORTS,
} from '@profils-actifs/shared';

const MAX_FILTER_LENGTH = 120;

/** Postgres refuses a NUL byte inside a text value, so a filter carrying one
 *  would fail deep in the driver instead of at the edge. */
const NUL_BYTE = /\u0000/;

export const printableText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((value) => !NUL_BYTE.test(value), { error: 'Caractère non autorisé' });

export const idSchema = printableText(64);

/** Query strings carry booleans as text; anything else than an explicit true
 *  value reads as false. */
export const booleanQueryParam = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((value) => value === true || value === 'true' || value === '1');

/** Accepts both `?skills=a&skills=b` and `?skills=a,b`. */
const listQueryParam = z
  .union([z.string(), z.array(z.string())])
  .transform((value) => (Array.isArray(value) ? value : value.split(',')))
  .transform((entries) => entries.map((entry) => entry.trim()).filter((entry) => entry.length > 0));

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export const catalogueQuerySchema = paginationQuerySchema.extend({
  q: printableText(CATALOGUE_SEARCH_MAX_LENGTH).optional(),
  sector: printableText(MAX_FILTER_LENGTH).optional(),
  location: printableText(MAX_FILTER_LENGTH).optional(),
  skills: listQueryParam
    .pipe(z.array(printableText(MAX_FILTER_LENGTH)).max(CATALOGUE_MAX_SKILL_FILTERS))
    .optional(),
  certifiedOnly: booleanQueryParam.optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  hasVideo: booleanQueryParam.optional(),
  favoritesOnly: booleanQueryParam.optional(),
  sort: z.enum(CATALOGUE_SORTS).default('recent'),
});

export type CatalogueQueryInput = z.infer<typeof catalogueQuerySchema>;
