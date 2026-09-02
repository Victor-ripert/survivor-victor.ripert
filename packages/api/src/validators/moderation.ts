import { z } from 'zod';
import {
  MODERATION_ACTIONS,
  VIDEO_MODERATION_ACTIONS,
  VIDEO_MODERATION_QUEUE_FILTERS,
  VIDEO_MODERATION_REASON_MAX_LENGTH,
  VIDEO_MODERATION_REASON_MIN_LENGTH,
} from '@profils-actifs/shared';
import { optionalText, paginationQuerySchema, printableText } from './common.js';

const NOTES_MAX_LENGTH = 2000;
const PROFILE_REASON_MAX_LENGTH = 500;

/** Payload for `POST /admin/profiles/{id}/moderate`. */
export const moderateEntitySchema = z.object({
  action: z.enum(MODERATION_ACTIONS, { error: 'Action de modération invalide' }),
  reason: optionalText(PROFILE_REASON_MAX_LENGTH).optional(),
  notes: optionalText(NOTES_MAX_LENGTH).optional(),
});

export type ModerateEntityInput = z.infer<typeof moderateEntitySchema>;

/**
 * Payload for `POST /admin/videos/{videoId}/moderate`. The reason is required
 * in both directions and shown back to the candidate (brief §7.9.2) — "a video
 * that disappears without explanation is litigation starting".
 */
export const videoModerationSchema = z.object({
  action: z.enum(VIDEO_MODERATION_ACTIONS, { error: 'Action de modération invalide' }),
  reason: printableText(VIDEO_MODERATION_REASON_MAX_LENGTH, 'Le motif est requis').refine(
    (value) => value.length >= VIDEO_MODERATION_REASON_MIN_LENGTH,
    { error: `Le motif doit contenir au moins ${VIDEO_MODERATION_REASON_MIN_LENGTH} caractères` },
  ),
  notes: optionalText(NOTES_MAX_LENGTH).optional(),
});

export type VideoModerationInput = z.infer<typeof videoModerationSchema>;

export const videoModerationQuerySchema = paginationQuerySchema.extend({
  status: z.enum(VIDEO_MODERATION_QUEUE_FILTERS).default('PENDING'),
});

export type VideoModerationQuery = z.infer<typeof videoModerationQuerySchema>;
