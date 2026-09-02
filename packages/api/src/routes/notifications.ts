import { Router } from 'express';
import { getMyNotifications, markAsRead } from '../controllers/notifications.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const notificationsRouter = Router();

notificationsRouter.get('/', requireAuth, getMyNotifications);
notificationsRouter.patch('/:notificationId/read', requireAuth, markAsRead);
