import { Router } from 'express';
import {
  listProfiles,
  getProfile,
  getMyProfile,
  upsertMyProfile,
} from '../controllers/profile.controller.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';

export const profilesRouter = Router();

// /me must be registered before /:id — otherwise Express would match the
// literal path segment "me" as an :id value and this route would never be
// reached.
profilesRouter.get('/me', requireAuth, requireRole('APPLICANT'), getMyProfile);
profilesRouter.post('/me', requireAuth, requireRole('APPLICANT'), upsertMyProfile);

profilesRouter.get('/', listProfiles);
profilesRouter.get('/:id', optionalAuth, getProfile);
