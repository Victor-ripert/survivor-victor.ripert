import type { PaginationMeta } from './pagination.js';

export const NOTIFICATION_TYPES = [
  'NEW_INTERACTION_RECEIVED',
  'CERTIFICATION_BADGE_EARNED',
  'CERTIFICATION_ATTEMPT_INVALIDATED',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  interactionId: string | null;
  createdAt: string;
}

export interface NotificationPage {
  data: Notification[];
  pagination: PaginationMeta;
  /** Total unread notifications, not just on this page. */
  unread: number;
}
