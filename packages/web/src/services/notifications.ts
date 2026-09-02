import type { Notification, NotificationPage } from '@profils-actifs/shared';
import { api } from './api.js';

export const fetchNotifications = async (
  page: number,
  signal?: AbortSignal,
): Promise<NotificationPage> => {
  const response = await api.get<NotificationPage>('/notifications', {
    params: page > 1 ? { page } : {},
    signal,
  });
  return response.data;
};

export const markNotificationRead = async (notificationId: string): Promise<Notification> => {
  const response = await api.patch<Notification>(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
  );
  return response.data;
};
