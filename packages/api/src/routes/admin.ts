import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { getDashboard } from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole(UserRole.ADMIN));

adminRouter.get('/dashboard', getDashboard);
