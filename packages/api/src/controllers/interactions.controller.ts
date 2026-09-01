import { UserRole } from '@prisma/client';
import type { Request, Response } from 'express';
import {
  listInteractions,
  recordInteraction,
  updateInteraction,
  type InteractionDirection,
} from '../services/interaction.service.js';
import { currentUser } from '../utils/current-user.js';
import {
  createInteractionSchema,
  listInteractionsQuerySchema,
  updateInteractionSchema,
} from '../validators/interactions.js';
import { parseId } from '../validators/common.js';

/** A job-seeker's own list is what they received; everyone else's is what they
 *  sent. Either side can ask for the other explicitly. */
const defaultDirection = (role: UserRole): InteractionDirection =>
  role === UserRole.APPLICANT ? 'received' : 'sent';

export const listMyInteractions = async (req: Request, res: Response): Promise<void> => {
  const user = currentUser(req);
  const { direction, type, page, limit } = listInteractionsQuerySchema.parse(req.query);

  res.status(200).json(
    await listInteractions({
      viewerId: user.id,
      direction: direction ?? defaultDirection(user.role),
      types: type ? [type] : undefined,
      page,
      limit,
    }),
  );
};

export const createInteraction = async (req: Request, res: Response): Promise<void> => {
  const { recipientId, type, message } = createInteractionSchema.parse(req.body);
  const { interaction, created } = await recordInteraction({
    actorId: currentUser(req).id,
    applicantId: recipientId,
    type,
    message,
  });

  res.status(created ? 201 : 200).json(interaction);
};

export const patchInteraction = async (req: Request, res: Response): Promise<void> => {
  const interactionId = parseId(req.params.interactionId);
  const patch = updateInteractionSchema.parse(req.body);

  res.status(200).json(await updateInteraction(interactionId, currentUser(req).id, patch));
};
