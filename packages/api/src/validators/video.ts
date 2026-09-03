import { z } from 'zod';
import {
  VIDEO_DESCRIPTION_MAX_LENGTH,
  VIDEO_TITLE_MAX_LENGTH,
  VIDEO_TYPES,
} from '@profils-actifs/shared';
import { optionalText, printableText } from './common.js';

/**
 * Payload for `POST /profiles/{profileId}/videos`.
 *
 * Format-level validation only — is this a well-formed URL — lives here.
 * Business-level validation — is it actually a YouTube/Vimeo URL — is the
 * video service's job, so this schema keeps its shape when those rules move.
 *
 * `consentAccepted` must be literally `true`: publishing a video is the
 * consent act the API logs with the version of the text that was accepted
 * (brief §7.1), so an unticked box is a validation error, not a default.
 */
export const addVideoSchema = z.object({
  title: printableText(VIDEO_TITLE_MAX_LENGTH, 'Titre requis'),
  description: optionalText(VIDEO_DESCRIPTION_MAX_LENGTH).optional(),
  type: z.enum(VIDEO_TYPES, { error: 'Type de vidéo invalide' }),
  url: z.url({ error: 'URL invalide' }),
  duration: z
    .number()
    .int({ error: 'La durée doit être un entier (secondes)' })
    .positive({ error: 'La durée doit être positive' })
    .optional(),
  consentAccepted: z.literal(true, {
    error: 'Le consentement à la diffusion de la vidéo est requis',
  }),
});

export type AddVideoInput = z.infer<typeof addVideoSchema>;
