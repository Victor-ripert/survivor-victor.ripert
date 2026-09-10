import type { Request, Response } from 'express';
import * as videoService from '../services/video.service.js';
import { currentUser } from '../utils/current-user.js';
import { badRequest } from '../utils/http-error.js';
import { parseId } from '../validators/common.js';
import { addVideoSchema } from '../validators/video.js';

/** `GET /profiles/:profileId/videos` — public, behind `optionalAuth` like `getProfile`. */
export const listVideos = async (req: Request, res: Response): Promise<void> => {
  res
    .status(200)
    .json(await videoService.listVideosForProfile(parseId(req.params.profileId), req.user?.id));
};

/**
 * `POST /profiles/:profileId/videos` — applicant only. `middleware/video-
 * upload.ts` runs ahead of this handler (routes/videos.ts): for `type:
 * 'UPLOAD'` it has already turned the multipart body into `req.file` and
 * `req.body`'s text fields, and it leaves a JSON `EXTERNAL_LINK` body
 * untouched, so both branches read `req.body` the same way here.
 */
export const addVideo = async (req: Request, res: Response): Promise<void> => {
  const input = addVideoSchema.parse(req.body);
  const profileId = parseId(req.params.profileId);
  const ownerId = currentUser(req).id;

  if (input.type === 'UPLOAD') {
    if (!req.file) throw badRequest('Un fichier vidéo est requis');

    res
      .status(201)
      .json(
        await videoService.addUploadedVideo(profileId, ownerId, input, {
          buffer: req.file.buffer,
        }),
      );
    return;
  }

  res.status(201).json(await videoService.addExternalVideo(profileId, ownerId, input));
};

/** `DELETE /videos/:videoId` — applicant only, ownership checked in the service. */
export const deleteVideo = async (req: Request, res: Response): Promise<void> => {
  await videoService.deleteVideo(parseId(req.params.videoId), currentUser(req).id);
  res.status(204).send();
};
