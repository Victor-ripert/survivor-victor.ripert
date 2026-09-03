import { UserRole } from '@prisma/client';
import { Router } from 'express';
import {
  addMySkill,
  getMyProfile,
  getProfile,
  listProfiles,
  removeMySkill,
  upsertMyProfile,
} from '../controllers/profile.controller.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';

export const profilesRouter = Router();

const applicantOnly = [requireAuth, requireRole(UserRole.APPLICANT)];

// /me is registered before /:id — otherwise Express would match the literal
// segment "me" as an :id value and these routes would never be reached.
profilesRouter.get('/me', applicantOnly, getMyProfile);
profilesRouter.post('/me', applicantOnly, upsertMyProfile);
profilesRouter.post('/me/skills', applicantOnly, addMySkill);
profilesRouter.delete('/me/skills/:skillId', applicantOnly, removeMySkill);

profilesRouter.get('/', listProfiles);
profilesRouter.get('/:id', optionalAuth, getProfile);
