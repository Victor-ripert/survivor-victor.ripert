import type { Request, Response } from 'express';
import * as videoService from '../services/video.service.js';
import { currentUser } from '../utils/current-user.js';
import { notImplemented } from '../utils/http-error.js';
import { parseId } from '../validators/common.js';
import { addVideoSchema } from '../validators/video.js';

/** `GET /profiles/:profileId/videos` — public, behind `optionalAuth` like `getProfile`. */
export const listVideos = async (req: Request, res: Response): Promise<void> => {
  res
    .status(200)
    .json(await videoService.listVideosForProfile(parseId(req.params.profileId), req.user?.id));
};

/**
 * `POST /profiles/:profileId/videos` — applicant only. `EXTERNAL_LINK` is the
 * shipped path; `UPLOAD` answers an honest 501 until a route parses multipart
 * bodies into `addUploadedVideo`, rather than failing in a more confusing way.
 */
export const addVideo = async (req: Request, res: Response): Promise<void> => {
  const input = addVideoSchema.parse(req.body);

  if (input.type === 'UPLOAD') {
    throw notImplemented(
      "Le dépôt direct de vidéo n'est pas disponible : utilisez un lien YouTube ou Vimeo",
    );
  }

  res
    .status(201)
    .json(
      await videoService.addExternalVideo(
        parseId(req.params.profileId),
        currentUser(req).id,
        input,
      ),
    );
};

/** `DELETE /videos/:videoId` — applicant only, ownership checked in the service. */
export const deleteVideo = async (req: Request, res: Response): Promise<void> => {
  await videoService.deleteVideo(parseId(req.params.videoId), currentUser(req).id);
  res.status(204).send();
};
