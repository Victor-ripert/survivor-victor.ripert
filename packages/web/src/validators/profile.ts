import { z } from 'zod';

/**
 * Client-side mirror of the API's own `upsertProfileSchema`
 * (`packages/api/src/validators/profile.ts`) — same limits, same required
 * fields, matching the shared `ProfileInput` DTO from `@profils-actifs/shared`.
 * Not literally the same schema object (`web` can't import from the
 * server-only `api` package), so this exists to give the user an immediate,
 * in-form error instead of waiting on a round trip — the API validates
 * independently regardless (CLAUDE.md: "Backend validates independently of
 * the frontend") and remains the actual authority if the two ever drift.
 */
export const myProfileFormSchema = z.object({
  headline: z.string().max(120, { error: 'Le titre ne peut pas dépasser 120 caractères' }),
  bio: z.string().max(2000, { error: 'La bio ne peut pas dépasser 2000 caractères' }),
  location: z.string().min(1, { error: 'Localisation requise' }),
  sector: z.string().min(1, { error: 'Secteur requis' }),
});

export type MyProfileFormValues = z.infer<typeof myProfileFormSchema>;
