import { prisma } from '../config/prisma.js';
import type { NotificationType, Notification } from '@prisma/client';

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  interactionId?: string;
}

export const createNotification = (input: CreateNotificationInput): Promise<Notification> => {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      interactionId: input.interactionId,
    },
  });
};

export const notifyNewInteraction = (
  recipientId: string,
  interactionId: string
): Promise<Notification> => {
  return createNotification({
    userId: recipientId,
    type: 'NEW_INTERACTION_RECEIVED',
    title: 'Nouvelle interaction recruteur',
    message: 'Un recruteur a consulté ou contacté votre profil.',
    interactionId,
  });
};

export const listNotifications = (userId: string): Promise<Notification[]> => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
};

export const markNotificationAsRead = async (
  notificationId: string,
  userId: string
): Promise<Notification | null> => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== userId) {
    return null;
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
};