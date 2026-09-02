import type { Request, Response } from 'express';
import {
  countUnreadNotifications,
  listNotifications,
  markNotificationAsRead,
} from '../services/notifications.js';
import { currentUser } from '../utils/current-user.js';
import { parseId, paginationQuerySchema } from '../validators/common.js';

export const getMyNotifications = async (req: Request, res: Response): Promise<void> => {
  const { page, limit } = paginationQuerySchema.parse(req.query);
  const { id } = currentUser(req);

  const [notifications, unread] = await Promise.all([
    listNotifications(id, page, limit),
    countUnreadNotifications(id),
  ]);

  res.status(200).json({ ...notifications, unread });
};

export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  const notification = await markNotificationAsRead(
    parseId(req.params.notificationId),
    currentUser(req).id,
  );

  res.status(200).json(notification);
};
