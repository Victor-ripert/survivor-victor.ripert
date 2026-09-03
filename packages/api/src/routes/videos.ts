import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { addVideo, deleteVideo, listVideos } from '../controllers/video.controller.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';

/**
 * Mounted at the bare `/api` prefix in `app.ts`, not `/api/videos`: its routes
 * live under two different top-level paths (`/profiles/:profileId/videos` and
 * `/videos/:videoId`), so there is no single prefix that fits both.
 */
export const videosRouter = Router();

const applicantOnly = [requireAuth, requireRole(UserRole.APPLICANT)];

videosRouter.get('/profiles/:profileId/videos', optionalAuth, listVideos);
videosRouter.post('/profiles/:profileId/videos', applicantOnly, addVideo);
videosRouter.delete('/videos/:videoId', applicantOnly, deleteVideo);
