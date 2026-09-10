import { z } from 'zod';
import { VIDEO_DESCRIPTION_MAX_LENGTH, VIDEO_TITLE_MAX_LENGTH } from '@profils-actifs/shared';
import { optionalText, printableText } from './common.js';

const title = printableText(VIDEO_TITLE_MAX_LENGTH, 'Titre requis');
const description = optionalText(VIDEO_DESCRIPTION_MAX_LENGTH).optional();

const duration = z
  .number()
  .int({ error: 'La durée doit être un entier (secondes)' })
  .positive({ error: 'La durée doit être positive' })
  .optional();

const consentAccepted = z.literal(true, {
  error: 'Le consentement à la diffusion de la vidéo est requis',
});

/** `multipart/form-data` sends every field as a string, so `type: 'UPLOAD'`
 *  reuses `duration`/`consentAccepted` behind a preprocessor that coerces
 *  multer's string form back to the real type before the same check the JSON
 *  body applies runs — a bare `'false'` must not read as truthy. */
const coerceMultipartString =
  <T>(coerce: (value: string) => T) =>
  (value: unknown): unknown =>
    typeof value === 'string' ? coerce(value) : value;

const uploadDuration = z.preprocess(coerceMultipartString(Number), duration);
const uploadConsentAccepted = z.preprocess(
  coerceMultipartString((value) => value === 'true'),
  consentAccepted,
);

/**
 * `type: 'EXTERNAL_LINK'` — a JSON body. Format-level validation only — is
 * this a well-formed URL — lives here; business-level validation — is it
 * actually a YouTube/Vimeo URL — is the video service's job, so this schema
 * keeps its shape when those rules move.
 */
export const addExternalVideoSchema = z.object({
  title,
  description,
  type: z.literal('EXTERNAL_LINK'),
  url: z.url({ error: 'URL invalide' }),
  duration,
  consentAccepted,
});

/**
 * `type: 'UPLOAD'` — `multipart/form-data`, parsed by the multer middleware
 * in `middleware/video-upload.ts` into `req.body`'s text fields plus
 * `req.file`'s buffer. No `url`: the file itself is the content.
 */
export const addUploadedVideoSchema = z.object({
  title,
  description,
  type: z.literal('UPLOAD'),
  duration: uploadDuration,
  consentAccepted: uploadConsentAccepted,
});

export const addVideoSchema = z.discriminatedUnion('type', [
  addExternalVideoSchema,
  addUploadedVideoSchema,
]);

export type AddVideoInput = z.infer<typeof addVideoSchema>;
export type AddExternalVideoInput = z.infer<typeof addExternalVideoSchema>;
export type AddUploadedVideoInput = z.infer<typeof addUploadedVideoSchema>;
