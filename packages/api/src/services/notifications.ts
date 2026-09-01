import type { Notification, NotificationType, Prisma } from '@prisma/client';
import {
  buildPaginationMeta,
  resolvePageRequest,
  type PaginatedResponse,
} from '@profils-actifs/shared';
import { prisma } from '../config/prisma.js';
import { notFound } from '../utils/http-error.js';

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  interactionId?: string;
}

/**
 * `client` lets a caller enlist the notification in its own transaction, so a
 * side effect that must not outlive a failed write (telling someone they were
 * contacted when the interaction rolled back) never does. It defaults to the
 * shared client for standalone use.
 */
export const createNotification = (
  input: CreateNotificationInput,
  client: Prisma.TransactionClient = prisma,
): Promise<Notification> => client.notification.create({ data: input });

export interface InteractionActor {
  firstName: string;
  lastName: string;
}

/**
 * Raised when a recruiter reaches out. Views and favourites deliberately do
 * not notify — only a message is something the job-seeker has to act on — so
 * the wording names the sender rather than describing a vague "interaction".
 */
export const notifyNewInteraction = (
  recipientId: string,
  interactionId: string,
  actor: InteractionActor,
  client?: Prisma.TransactionClient,
): Promise<Notification> =>
  createNotification(
    {
      userId: recipientId,
      type: 'NEW_INTERACTION_RECEIVED',
      title: 'Nouveau message de recruteur',
      message: `${actor.firstName} ${actor.lastName} souhaite échanger avec vous.`,
      interactionId,
    },
    client,
  );

/** Raised when a completed attempt actually earns a badge — a rejected
 *  attempt is not something to congratulate anyone about. */
export const notifyBadgeEarned = (
  userId: string,
  badgeName: string,
  score: number,
  client?: Prisma.TransactionClient,
): Promise<Notification> =>
  createNotification(
    {
      userId,
      type: 'CERTIFICATION_BADGE_EARNED',
      title: 'Badge de certification obtenu',
      message: `Vous avez obtenu le badge "${badgeName}" avec un score de ${score}/100.`,
    },
    client,
  );

export const listNotifications = async (
  userId: string,
  page?: number,
  limit?: number,
): Promise<PaginatedResponse<Notification>> => {
  const pageRequest = resolvePageRequest(page, limit);
  const where = { userId };

  const [data, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: pageRequest.skip,
      take: pageRequest.limit,
    }),
    prisma.notification.count({ where }),
  ]);

  return { data, pagination: buildPaginationMeta(total, pageRequest) };
};

export const countUnreadNotifications = (userId: string): Promise<number> =>
  prisma.notification.count({ where: { userId, isRead: false } });

/**
 * Ownership is part of the `where` clause rather than a separate read, so
 * marking someone else's notification as read matches nothing instead of
 * revealing that it exists.
 */
export const markNotificationAsRead = async (
  notificationId: string,
  userId: string,
): Promise<Notification> => {
  const { count } = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });

  if (count === 0) throw notFound('Notification introuvable');

  return prisma.notification.findUniqueOrThrow({ where: { id: notificationId } });
};
