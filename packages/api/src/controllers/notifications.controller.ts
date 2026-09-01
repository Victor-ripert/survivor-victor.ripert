import type { Request, Response } from 'express';
import {
  listNotifications,
  markNotificationAsRead,
} from '../services/notifications.js';

export const getMyNotifications = async (req: Request, res: Response): Promise<void> => {
  const notifications = await listNotifications(req.user!.id);
  res.status(200).json(notifications);
};

export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  const { notificationId } = req.params;
  const notification = await markNotificationAsRead(notificationId, req.user!.id);
  if (!notification) {
    res.status(404).json({
      error: 'not_found',
      message: 'Notification not found',
      statusCode: 404,
    });
    return;
  }

  res.status(200).json(notification);
};