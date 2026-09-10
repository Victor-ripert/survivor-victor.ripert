import { z } from 'zod';
import {
  AVAILABILITY_STATUSES,
  PROFILE_BIO_MAX_LENGTH,
  PROFILE_FIELD_MAX_LENGTH,
  PROFILE_HEADLINE_MAX_LENGTH,
  VIDEO_TITLE_MAX_LENGTH,
} from '@profils-actifs/shared';

/** Client-side twin of the API's `upsertProfileSchema`, for instant feedback;
 *  the API validates independently and stays the authority. */
export const profileFormSchema = z.object({
  headline: z
    .string()
    .trim()
    .max(PROFILE_HEADLINE_MAX_LENGTH, {
      error: `Le titre ne peut pas dépasser ${PROFILE_HEADLINE_MAX_LENGTH} caractères`,
    }),
  bio: z
    .string()
    .trim()
    .max(PROFILE_BIO_MAX_LENGTH, {
      error: `La présentation ne peut pas dépasser ${PROFILE_BIO_MAX_LENGTH} caractères`,
    }),
  location: z
    .string()
    .trim()
    .min(1, { error: 'Localisation requise' })
    .max(PROFILE_FIELD_MAX_LENGTH),
  sector: z.string().trim().min(1, { error: 'Secteur requis' }).max(PROFILE_FIELD_MAX_LENGTH),
  /** `''` is the "not stated" option of the select, not a value the API
   *  accepts — `ProfileForm` turns it into the `null` that clears the column.
   *  Declaring the field as an optional enum instead would make an untouched
   *  select indistinguishable from a deliberate clear. */
  availability: z.enum(['', ...AVAILABILITY_STATUSES], { error: 'Disponibilité invalide' }),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const EMPTY_PROFILE_FORM: ProfileFormValues = {
  headline: '',
  bio: '',
  location: '',
  sector: '',
  availability: '',
};

const videoTitle = z
  .string()
  .trim()
  .min(1, { error: 'Titre requis' })
  .max(VIDEO_TITLE_MAX_LENGTH, {
    error: `Le titre ne peut pas dépasser ${VIDEO_TITLE_MAX_LENGTH} caractères`,
  });

const videoConsentAccepted = z.literal(true, {
  error: 'Cochez la case de consentement pour publier la vidéo',
});

/** Client-side twin of the API's `addVideoSchema` — same two shapes for the
 *  same two values of `type`, for instant feedback before the round trip. */
export const videoFormSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('EXTERNAL_LINK'),
    title: videoTitle,
    url: z.string().trim().pipe(z.url({ error: 'Collez un lien YouTube ou Vimeo valide' })),
    consentAccepted: videoConsentAccepted,
  }),
  z.object({
    type: z.literal('UPLOAD'),
    title: videoTitle,
    file: z.instanceof(File, { error: 'Choisissez un fichier vidéo (mp4, webm ou mov)' }),
    consentAccepted: videoConsentAccepted,
  }),
]);

/**
 * Controlled form state, flat regardless of `type` so a single `update()`
 * helper can drive every field — `url`/`file` just sit unused while the
 * other type is selected, same as `ProfileFormValues.availability`'s `''`
 * sentinel for "not stated". `videoFormSchema` is what actually enforces
 * which fields matter for the selected type.
 */
export type VideoFormValues = {
  type: 'EXTERNAL_LINK' | 'UPLOAD';
  title: string;
  url: string;
  file: File | null;
  consentAccepted: boolean;
};

export const EMPTY_VIDEO_FORM: VideoFormValues = {
  type: 'EXTERNAL_LINK',
  title: '',
  url: '',
  file: null,
  consentAccepted: false,
};
