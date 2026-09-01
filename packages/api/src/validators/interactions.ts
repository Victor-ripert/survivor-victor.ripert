import { InteractionType } from '@prisma/client';
import { z } from 'zod';
import { CONTACT_MESSAGE_MAX_LENGTH, CONTACT_MESSAGE_MIN_LENGTH } from '@profils-actifs/shared';
import { idSchema, paginationQuerySchema, printableText } from './common.js';

const MESSAGE_TYPES: InteractionType[] = [InteractionType.CONTACT, InteractionType.MESSAGE];

export const createInteractionSchema = z
  .object({
    recipientId: idSchema,
    type: z.enum(InteractionType),
    message: printableText(CONTACT_MESSAGE_MAX_LENGTH)
      .refine((value) => value.length >= CONTACT_MESSAGE_MIN_LENGTH, {
        error: `Le message doit contenir au moins ${CONTACT_MESSAGE_MIN_LENGTH} caractères`,
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    const needsMessage = MESSAGE_TYPES.includes(value.type);

    if (needsMessage && !value.message) {
      ctx.addIssue({
        code: 'custom',
        path: ['message'],
        message: 'Un message est requis pour une prise de contact',
      });
    }

    if (!needsMessage && value.message) {
      ctx.addIssue({
        code: 'custom',
        path: ['message'],
        message: `Un message n'est pas accepté pour une interaction de type ${value.type}`,
      });
    }
  });

export const updateInteractionSchema = z
  .object({
    isViewed: z.boolean().optional(),
    isFavorite: z.boolean().optional(),
  })
  .refine((value) => value.isViewed !== undefined || value.isFavorite !== undefined, {
    error: 'Aucune modification fournie',
  });

export const listInteractionsQuerySchema = paginationQuerySchema.extend({
  direction: z.enum(['sent', 'received']).optional(),
  type: z.enum(InteractionType).optional(),
});

export type CreateInteractionInput = z.infer<typeof createInteractionSchema>;
export type UpdateInteractionInput = z.infer<typeof updateInteractionSchema>;
