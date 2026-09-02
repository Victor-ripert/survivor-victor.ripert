import { z } from 'zod';
import { MODERATION_ACTIONS } from '@profils-actifs/shared';

/**
 * Payload for `POST /admin/profiles/{id}/moderate` and, once its
 * controller/route land, `POST /admin/videos/{id}/moderate` (both are
 * documented in `openapi.yaml`; only the profile one is wired up today).
 */
export const moderateEntitySchema = z.object({
  action: z.enum(MODERATION_ACTIONS, { error: 'Action de modération invalide' }),
  reason: z
    .string()
    .max(500, { error: 'La raison ne peut pas dépasser 500 caractères' })
    .optional(),
  notes: z
    .string()
    .max(2000, { error: 'Les notes ne peuvent pas dépasser 2000 caractères' })
    .optional(),
});

export type ModerateEntityInput = z.infer<typeof moderateEntitySchema>;
