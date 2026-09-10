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

export const videoFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: 'Titre requis' })
    .max(VIDEO_TITLE_MAX_LENGTH, {
      error: `Le titre ne peut pas dépasser ${VIDEO_TITLE_MAX_LENGTH} caractères`,
    }),
  url: z
    .string()
    .trim()
    .pipe(z.url({ error: 'Collez un lien YouTube ou Vimeo valide' })),
  consentAccepted: z.literal(true, {
    error: 'Cochez la case de consentement pour publier la vidéo',
  }),
});

export type VideoFormValues = { title: string; url: string; consentAccepted: boolean };

export const EMPTY_VIDEO_FORM: VideoFormValues = { title: '', url: '', consentAccepted: false };
