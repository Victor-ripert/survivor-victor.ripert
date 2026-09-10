import { z } from 'zod';
import {
  AVAILABILITY_STATUSES,
  CATALOGUE_DEFAULT_SORT,
  CATALOGUE_MAX_SKILL_FILTERS,
  CATALOGUE_SEARCH_MAX_LENGTH,
  CATALOGUE_SORTS,
} from '@profils-actifs/shared';
import {
  booleanQueryParam,
  listQueryParam,
  paginationQuerySchema,
  printableText,
} from './common.js';

const MAX_FILTER_LENGTH = 120;

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
  availability: z.enum(AVAILABILITY_STATUSES, { error: 'Disponibilité invalide' }).optional(),
  favoritesOnly: booleanQueryParam.optional(),
  sort: z.enum(CATALOGUE_SORTS).default(CATALOGUE_DEFAULT_SORT),
});

export type CatalogueQueryInput = z.infer<typeof catalogueQuerySchema>;
