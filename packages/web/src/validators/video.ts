import { z } from 'zod';

/**
 * Client-side mirror of the API's own `addVideoSchema`
 * (`packages/api/src/validators/video.ts`), narrowed to the two fields
 * `MyProfilePage`'s add-video form actually collects. `type` isn't part of
 * this form's input: it's fixed to `EXTERNAL_LINK` in `services/videos.ts`,
 * since `UPLOAD` still answers `501 not_implemented` server-side — offering
 * it as a choice here would just let someone submit something guaranteed
 * to fail.
 */
export const addVideoFormSchema = z.object({
  title: z
    .string()
    .min(1, { error: 'Titre requis' })
    .max(120, { error: 'Le titre ne peut pas dépasser 120 caractères' }),
  url: z.url({ error: 'URL invalide' }),
});

export type AddVideoFormValues = z.infer<typeof addVideoFormSchema>;
