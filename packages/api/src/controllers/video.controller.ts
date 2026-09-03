import type { Request, Response } from 'express';
import { addVideoSchema } from '../validators/video.js';
import * as videoService from '../services/video.service.js';

/** `GET /profiles/:profileId/videos` — public (mounted behind `optionalAuth`, same reasoning as `getProfile`). */
export const listVideos = async (req: Request, res: Response): Promise<void> => {
  const videos = await videoService.listVideosForProfile(
    req.params.profileId as string,
    req.user?.id,
  );
  res.status(200).json(videos);
};

/**
 * `POST /profiles/:profileId/videos` — applicant only. Handles the
 * `EXTERNAL_LINK` path (issue #4a) fully; `UPLOAD` gets an honest 501 —
 * the service-layer logic for it already exists
 * (`video.service.ts`'s `addUploadedVideo`, from issue #4b), but nothing
 * parses a real multipart request into a `Buffer` yet (that needs
 * `multer`, not currently a dependency), so there's no route wiring to
 * call it from. A 501 says that plainly instead of pretending to support
 * uploads and failing in some more confusing way.
 */
export const addVideo = async (req: Request, res: Response): Promise<void> => {
  const parsed = addVideoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'validation_error',
      message: parsed.error.issues[0]?.message ?? 'Invalid input',
      statusCode: 400,
    });
    return;
  }

  if (parsed.data.type === 'UPLOAD') {
    res.status(501).json({
      error: 'not_implemented',
      message:
        'Direct video upload is not available yet — use an EXTERNAL_LINK (YouTube/Vimeo) instead.',
      statusCode: 501,
    });
    return;
  }

  const video = await videoService.addExternalVideo(
    req.params.profileId as string,
    req.user!.id,
    parsed.data,
  );
  res.status(201).json(video);
};

/** `DELETE /videos/:videoId` — applicant only, ownership checked in the service. */
export const deleteVideo = async (req: Request, res: Response): Promise<void> => {
  await videoService.deleteVideo(req.params.videoId as string, req.user!.id);
  res.status(204).send();
};
