import multer from 'multer';
import { env } from '../config/env.js';

/**
 * Parses `POST /profiles/:profileId/videos` when `type: 'UPLOAD'` sends
 * `multipart/form-data` — the only route that does. `express.json()`
 * (`app.ts`) only parses `application/json` bodies and leaves any other
 * content type alone, so this is the one place a multipart body is read.
 *
 * Memory storage, not disk: `video.service.ts#addUploadedVideo` already
 * takes a fully-read `Buffer` — it content-sniffs before anything touches
 * disk (`video-providers/local.ts`), which has to happen before a provider
 * ever sees the bytes. `limits.fileSize` bounds how much of an oversized
 * body gets buffered before multer gives up; `assertUploadSizeWithinLimit`
 * in the service is still the authoritative check against `MAX_VIDEO_SIZE`.
 */
export const parseUploadedVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_VIDEO_SIZE },
}).single('file');
