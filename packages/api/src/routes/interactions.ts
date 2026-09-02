import { InteractionType, UserRole } from '@prisma/client';
import { Router, type NextFunction, type Request, type Response } from 'express';
import {
  createInteraction,
  listMyInteractions,
  patchInteraction,
} from '../controllers/interactions.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { contactRateLimiter } from '../middleware/rate-limit.js';

/** Only interactions that reach a job-seeker's notifications are throttled;
 *  views and favourites are ordinary browsing and would otherwise exhaust the
 *  budget while a recruiter reads through the catalogue. */
const throttleContactAttempts = (req: Request, res: Response, next: NextFunction): void => {
  const type = (req.body as { type?: string } | undefined)?.type;

  if (type === InteractionType.CONTACT || type === InteractionType.MESSAGE) {
    contactRateLimiter(req, res, next);
    return;
  }

  next();
};

export const interactionsRouter = Router();

interactionsRouter.use(requireAuth);

interactionsRouter.get('/', listMyInteractions);
interactionsRouter.post(
  '/',
  requireRole(UserRole.RECRUITER, UserRole.ADMIN),
  throttleContactAttempts,
  createInteraction,
);
interactionsRouter.patch('/:interactionId', patchInteraction);
