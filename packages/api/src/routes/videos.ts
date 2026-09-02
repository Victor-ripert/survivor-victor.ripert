import { Router } from 'express';
import { listVideos, addVideo, deleteVideo } from '../controllers/video.controller.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';

/**
 * Unlike the other route files, this one is mounted at the bare `/api`
 * prefix in `index.ts`, not `/api/videos` — its two routes live under two
 * different top-level paths (`/profiles/:profileId/videos` and
 * `/videos/:videoId`), so there's no single prefix that fits both. Keeping
 * them in one file still matches how the issue groups them (they're one
 * controller's routes), it's just the mount point that's unusual.
 */
export const videosRouter = Router();

videosRouter.get('/profiles/:profileId/videos', optionalAuth, listVideos);
videosRouter.post(
  '/profiles/:profileId/videos',
  requireAuth,
  requireRole('APPLICANT'),
  addVideo,
);
videosRouter.delete('/videos/:videoId', requireAuth, requireRole('APPLICANT'), deleteVideo);
