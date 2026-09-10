import { z } from 'zod';
import {
  AVAILABILITY_STATUSES,
  PROFILE_BIO_MAX_LENGTH,
  PROFILE_FIELD_MAX_LENGTH,
  PROFILE_HEADLINE_MAX_LENGTH,
  SKILL_LEVELS,
  SKILL_NAME_MAX_LENGTH,
} from '@profils-actifs/shared';
import { optionalText, paginationQuerySchema, printableText } from './common.js';

/**
 * Payload for `POST /profiles/me` (create-or-update, applicant only).
 * `headline`/`bio` may be sent blank to clear them; omitting the key leaves
 * the stored value untouched.
 */
export const upsertProfileSchema = z.object({
  headline: optionalText(PROFILE_HEADLINE_MAX_LENGTH).optional(),
  bio: optionalText(PROFILE_BIO_MAX_LENGTH).optional(),
  location: printableText(PROFILE_FIELD_MAX_LENGTH, 'Localisation requise'),
  sector: printableText(PROFILE_FIELD_MAX_LENGTH, 'Secteur requis'),
  /** `null` clears a declared availability; omitting the key leaves it
   *  alone, like `headline` and `bio` above. */
  availability: z
    .enum(AVAILABILITY_STATUSES, { error: 'Disponibilité invalide' })
    .nullable()
    .optional(),
});

export type UpsertProfileInput = z.infer<typeof upsertProfileSchema>;

/** Payload for `POST /profiles/me/skills`. */
export const addSkillSchema = z.object({
  skillName: printableText(SKILL_NAME_MAX_LENGTH, 'Nom de la compétence requis'),
  level: z.enum(SKILL_LEVELS, { error: 'Niveau invalide' }).default('INTERMEDIATE'),
});

export type AddSkillInput = z.infer<typeof addSkillSchema>;

/**
 * Query params for `GET /profiles`, the public feed: paging only. The feed is
 * browsable without an account and deliberately exposes no selection
 * criterion (docs/livrables/note-criteres-de-filtrage.md); filtering lives in
 * the role-gated recruiter catalogue.
 */
export const feedQuerySchema = paginationQuerySchema;

export type FeedQuery = z.infer<typeof feedQuerySchema>;
