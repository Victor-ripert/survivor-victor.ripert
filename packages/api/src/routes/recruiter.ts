import { UserRole } from '@prisma/client';
import { Router } from 'express';
import {
  deleteFavorite,
  getCatalogue,
  getDashboard,
  getFacets,
  getFavorites,
  putFavorite,
} from '../controllers/recruiter.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const recruiterRouter = Router();

recruiterRouter.use(requireAuth, requireRole(UserRole.RECRUITER, UserRole.ADMIN));

recruiterRouter.get('/catalogue', getCatalogue);
recruiterRouter.get('/catalogue/facets', getFacets);
recruiterRouter.get('/dashboard', getDashboard);
recruiterRouter.get('/favorites', getFavorites);
recruiterRouter.put('/favorites/:applicantId', putFavorite);
recruiterRouter.delete('/favorites/:applicantId', deleteFavorite);
