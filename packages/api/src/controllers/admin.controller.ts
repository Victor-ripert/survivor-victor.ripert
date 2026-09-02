import type { Request, Response } from 'express';
import { getAdminDashboard } from '../services/dashboard.service.js';
import * as moderationService from '../services/moderation.service.js';
import { currentUser } from '../utils/current-user.js';
import { paginationQuerySchema, parseId } from '../validators/common.js';
import {
  moderateEntitySchema,
  videoModerationQuerySchema,
  videoModerationSchema,
} from '../validators/moderation.js';

export const getDashboard = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json(await getAdminDashboard());
};

/** `GET /admin/moderation/profiles` — the review queue, oldest-pending-first. */
export const listPendingProfiles = async (req: Request, res: Response): Promise<void> => {
  res
    .status(200)
    .json(await moderationService.listPendingProfiles(paginationQuerySchema.parse(req.query)));
};

/** `POST /admin/profiles/:id/moderate`. */
export const moderateProfile = async (req: Request, res: Response): Promise<void> => {
  const { action, reason, notes } = moderateEntitySchema.parse(req.body);

  await moderationService.applyModeration(
    'profile',
    parseId(req.params.id),
    currentUser(req).id,
    action,
    reason || undefined,
    notes || undefined,
  );

  res.status(200).json({ message: 'Profil modéré' });
};

/** `GET /admin/moderation/videos` — pending by default, any status on request. */
export const listVideoModerationQueue = async (req: Request, res: Response): Promise<void> => {
  res
    .status(200)
    .json(
      await moderationService.listVideosForModeration(videoModerationQuerySchema.parse(req.query)),
    );
};

/** `POST /admin/videos/:videoId/moderate` — approve or reject, reason mandatory. */
export const moderateVideoDecision = async (req: Request, res: Response): Promise<void> => {
  res
    .status(200)
    .json(
      await moderationService.moderateVideo(
        parseId(req.params.videoId),
        currentUser(req).id,
        videoModerationSchema.parse(req.body),
      ),
    );
};
