import { z } from 'zod';
import { VIDEO_TYPES } from '@profils-actifs/shared';

/**
 * Payload for `POST /profiles/{profileId}/videos`.
 *
 * Format-level validation only — is this a well-formed URL — lives here.
 * Business-level validation — is it actually a YouTube/Vimeo URL, does an
 * UPLOAD file respect the 100MB cap — is the video *service*'s job (issue
 * #4a/#4b), not the validator's. Keeping that line means this schema
 * doesn't need to change shape when the service-layer rules do.
 *
 * `url` stays required for both `EXTERNAL_LINK` and `UPLOAD` because that's
 * what the contract specifies today. Once direct upload (#4b) is wired up,
 * an `UPLOAD` video's URL will likely be server-assigned after the file is
 * stored rather than client-supplied — if so, this becomes a discriminated
 * union on `type` at that point, not before.
 */
export const addVideoSchema = z.object({
  title: z
    .string()
    .min(1, { error: 'Titre requis' })
    .max(120, { error: 'Le titre ne peut pas dépasser 120 caractères' }),
  description: z
    .string()
    .max(500, { error: 'La description ne peut pas dépasser 500 caractères' })
    .optional(),
  type: z.enum(VIDEO_TYPES, { error: 'Type de vidéo invalide' }),
  url: z.url({ error: 'URL invalide' }),
  duration: z
    .number()
    .int({ error: 'La durée doit être un entier (secondes)' })
    .positive({ error: 'La durée doit être positive' })
    .optional(),
});

export type AddVideoInput = z.infer<typeof addVideoSchema>;
