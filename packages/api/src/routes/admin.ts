import { Router } from 'express';
import { listPendingProfiles, moderateProfile } from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const adminRouter = Router();

// Every route in this router is admin-only, with no exceptions — applied
// once at the router level instead of repeated on each individual route.
adminRouter.use(requireAuth, requireRole('ADMIN'));

adminRouter.get('/moderation/profiles', listPendingProfiles);
adminRouter.post('/profiles/:id/moderate', moderateProfile);
