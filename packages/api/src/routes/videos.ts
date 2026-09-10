import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { addVideo, deleteVideo, listVideos } from '../controllers/video.controller.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';
import { parseUploadedVideo } from '../middleware/video-upload.js';

/**
 * Mounted at the bare `/api` prefix in `app.ts`, not `/api/videos`: its routes
 * live under two different top-level paths (`/profiles/:profileId/videos` and
 * `/videos/:videoId`), so there is no single prefix that fits both.
 */
export const videosRouter = Router();

const applicantOnly = [requireAuth, requireRole(UserRole.APPLICANT)];

videosRouter.get('/profiles/:profileId/videos', optionalAuth, listVideos);
// Auth runs before multer touches the body, so an unauthenticated or
// wrong-role request is rejected without the server ever reading the file.
videosRouter.post('/profiles/:profileId/videos', applicantOnly, parseUploadedVideo, addVideo);
videosRouter.delete('/videos/:videoId', applicantOnly, deleteVideo);
