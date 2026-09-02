import type { Request, Response } from 'express';
import { paginationQuerySchema } from '../validators/pagination.js';
import { moderateEntitySchema } from '../validators/moderation.js';
import * as moderationService from '../services/moderation.service.js';
import { getAdminDashboard } from '../services/dashboard.service.js';

/** `GET /admin/moderation/profiles` — the review queue, oldest-pending-first. */
export const listPendingProfiles = async (req: Request, res: Response): Promise<void> => {
  const parsed = paginationQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: 'validation_error',
      message: parsed.error.issues[0]?.message ?? 'Invalid query',
      statusCode: 400,
    });
    return;
  }

  const result = await moderationService.listPendingProfiles(parsed.data);
  res.status(200).json(result);
};

/** `POST /admin/profiles/:id/moderate`. */
export const moderateProfile = async (req: Request, res: Response): Promise<void> => {
  const parsed = moderateEntitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'validation_error',
      message: parsed.error.issues[0]?.message ?? 'Invalid input',
      statusCode: 400,
    });
    return;
  }

  await moderationService.applyModeration(
    'profile',
    req.params.id as string,
    req.user!.id,
    parsed.data.action,
    parsed.data.reason,
    parsed.data.notes,
  );
  res.status(200).json({ message: 'Profile moderated' });
};

export const getDashboard = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json(await getAdminDashboard());
};
