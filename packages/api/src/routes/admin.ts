import { UserRole } from '@prisma/client';
import { Router } from 'express';
import {
  getDashboard,
  listPendingProfiles,
  listVideoModerationQueue,
  moderateProfile,
  moderateVideoDecision,
} from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const adminRouter = Router();

// Every route in this router is admin-only, with no exceptions — applied
// once at the router level instead of repeated on each individual route.
adminRouter.use(requireAuth, requireRole(UserRole.ADMIN));

adminRouter.get('/dashboard', getDashboard);
adminRouter.get('/moderation/profiles', listPendingProfiles);
adminRouter.post('/profiles/:id/moderate', moderateProfile);
adminRouter.get('/moderation/videos', listVideoModerationQueue);
adminRouter.post('/videos/:videoId/moderate', moderateVideoDecision);
