import { InteractionType, Prisma, UserRole } from '@prisma/client';
import {
  buildPaginationMeta,
  CONTACT_LIMIT_PER_APPLICANT_PER_DAY,
  CONTACT_LIMIT_WINDOW_MS,
  resolvePageRequest,
  VIEW_DEDUPE_WINDOW_MS,
  type InteractionDto,
  type PaginatedResponse,
} from '@profils-actifs/shared';
import { prisma } from '../config/prisma.js';
import { badRequest, forbidden, notFound, tooManyRequests } from '../utils/http-error.js';
import { notifyNewInteraction } from './notifications.js';

const MESSAGE_TYPES = [InteractionType.CONTACT, InteractionType.MESSAGE];

const counterpartSelect = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    role: true,
    profile: { select: { id: true } },
  },
} satisfies Prisma.UserDefaultArgs;

const interactionSelect = {
  id: true,
  type: true,
  message: true,
  isViewed: true,
  isFavorite: true,
  createdAt: true,
  recipientId: true,
  createdById: true,
  recipient: counterpartSelect,
  createdBy: counterpartSelect,
} satisfies Prisma.InteractionSelect;

type InteractionRow = Prisma.InteractionGetPayload<{ select: typeof interactionSelect }>;

/** The other party, from the point of view of whoever is reading the list. */
const toInteractionDto = (row: InteractionRow, viewerId: string): InteractionDto => {
  const counterpart = row.createdById === viewerId ? row.recipient : row.createdBy;

  return {
    id: row.id,
    type: row.type,
    message: row.message,
    isViewed: row.isViewed,
    isFavorite: row.isFavorite,
    createdAt: row.createdAt.toISOString(),
    recipientId: row.recipientId,
    createdById: row.createdById,
    counterpart: {
      id: counterpart.id,
      firstName: counterpart.firstName,
      lastName: counterpart.lastName,
      role: counterpart.role,
      profileId: counterpart.profile?.id ?? null,
    },
  };
};

/**
 * Interactions target job-seekers only. An unknown id, a deactivated account
 * and a recruiter account all answer 404 alike, so the endpoint cannot be used
 * to enumerate who holds an account.
 */
const loadApplicant = async (applicantId: string) => {
  const applicant = await prisma.user.findFirst({
    where: { id: applicantId, role: UserRole.APPLICANT, isActive: true },
    select: { id: true, firstName: true, lastName: true },
  });

  if (!applicant) throw notFound('Candidat introuvable');

  return applicant;
};

const assertMessageAllowed = async (
  tx: Prisma.TransactionClient,
  actorId: string,
  applicantId: string,
): Promise<void> => {
  const since = new Date(Date.now() - CONTACT_LIMIT_WINDOW_MS);
  const recentMessages = await tx.interaction.count({
    where: {
      createdById: actorId,
      recipientId: applicantId,
      type: { in: MESSAGE_TYPES },
      createdAt: { gte: since },
    },
  });

  if (recentMessages >= CONTACT_LIMIT_PER_APPLICANT_PER_DAY) {
    throw tooManyRequests(
      `Limite de ${CONTACT_LIMIT_PER_APPLICANT_PER_DAY} messages par candidat et par 24h atteinte`,
    );
  }
};

const findRecentView = async (actorId: string, applicantId: string) =>
  prisma.interaction.findFirst({
    where: {
      createdById: actorId,
      recipientId: applicantId,
      type: InteractionType.VIEW,
      createdAt: { gte: new Date(Date.now() - VIEW_DEDUPE_WINDOW_MS) },
    },
    orderBy: { createdAt: 'desc' },
    select: interactionSelect,
  });

export interface RecordInteractionInput {
  actorId: string;
  applicantId: string;
  type: InteractionType;
  message?: string;
}

export interface RecordInteractionResult {
  interaction: InteractionDto;
  created: boolean;
}

/**
 * Records a recruiter action on an applicant.
 *
 * Repeated views inside the dedupe window collapse onto the first one, so the
 * dashboards count people rather than page loads. Only messages notify the
 * applicant — a view is not something they need an alert about.
 */
export const recordInteraction = async ({
  actorId,
  applicantId,
  type,
  message,
}: RecordInteractionInput): Promise<RecordInteractionResult> => {
  if (actorId === applicantId) {
    throw forbidden('Impossible de créer une interaction avec soi-même');
  }

  const applicant = await loadApplicant(applicantId);

  if (type === InteractionType.FAVORITE) {
    return addFavorite(actorId, applicant.id);
  }

  if (type === InteractionType.VIEW) {
    const recentView = await findRecentView(actorId, applicant.id);
    if (recentView) {
      return { interaction: toInteractionDto(recentView, actorId), created: false };
    }

    const view = await prisma.interaction.create({
      data: { createdById: actorId, recipientId: applicant.id, type },
      select: interactionSelect,
    });

    return { interaction: toInteractionDto(view, actorId), created: true };
  }

  if (!message) throw badRequest('Un message est requis pour une prise de contact');

  const actor = await prisma.user.findUniqueOrThrow({
    where: { id: actorId },
    select: { firstName: true, lastName: true },
  });

  const row = await prisma.$transaction(async (tx) => {
    await assertMessageAllowed(tx, actorId, applicant.id);

    const interaction = await tx.interaction.create({
      data: { createdById: actorId, recipientId: applicant.id, type, message },
      select: interactionSelect,
    });

    // Same transaction as the interaction: a rolled-back contact must never
    // leave the applicant with a notification about it.
    await notifyNewInteraction(applicant.id, interaction.id, actor, tx);

    return interaction;
  });

  return { interaction: toInteractionDto(row, actorId), created: true };
};

/**
 * Favourites are stored as a `FAVORITE` interaction whose `isFavorite` flag
 * carries the current state, so removing one keeps the audit trail instead of
 * erasing that the recruiter was ever interested.
 */
export const addFavorite = async (
  recruiterId: string,
  applicantId: string,
): Promise<RecordInteractionResult> => {
  const { row, created } = await prisma.$transaction(async (tx) => {
    const existing = await tx.interaction.findFirst({
      where: { createdById: recruiterId, recipientId: applicantId, type: InteractionType.FAVORITE },
      orderBy: { createdAt: 'desc' },
      select: { id: true, isFavorite: true },
    });

    if (existing) {
      return {
        row: await tx.interaction.update({
          where: { id: existing.id },
          data: { isFavorite: true },
          select: interactionSelect,
        }),
        created: !existing.isFavorite,
      };
    }

    return {
      row: await tx.interaction.create({
        data: {
          createdById: recruiterId,
          recipientId: applicantId,
          type: InteractionType.FAVORITE,
          isFavorite: true,
        },
        select: interactionSelect,
      }),
      created: true,
    };
  });

  return { interaction: toInteractionDto(row, recruiterId), created };
};

/** Idempotent: removing a favourite that is not set is a no-op, not an error. */
export const removeFavorite = async (recruiterId: string, applicantId: string): Promise<void> => {
  await prisma.interaction.updateMany({
    where: {
      createdById: recruiterId,
      recipientId: applicantId,
      type: InteractionType.FAVORITE,
      isFavorite: true,
    },
    data: { isFavorite: false },
  });
};

export type InteractionDirection = 'sent' | 'received';

export interface ListInteractionsInput {
  viewerId: string;
  direction: InteractionDirection;
  types?: InteractionType[];
  page?: number;
  limit?: number;
}

export const listInteractions = async ({
  viewerId,
  direction,
  types,
  page,
  limit,
}: ListInteractionsInput): Promise<PaginatedResponse<InteractionDto>> => {
  const pageRequest = resolvePageRequest(page, limit);
  const where: Prisma.InteractionWhereInput = {
    ...(direction === 'sent' ? { createdById: viewerId } : { recipientId: viewerId }),
    ...(types?.length ? { type: { in: types } } : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.interaction.findMany({
      where,
      select: interactionSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: pageRequest.skip,
      take: pageRequest.limit,
    }),
    prisma.interaction.count({ where }),
  ]);

  return {
    data: rows.map((row) => toInteractionDto(row, viewerId)),
    pagination: buildPaginationMeta(total, pageRequest),
  };
};

export interface UpdateInteractionInput {
  isViewed?: boolean;
  isFavorite?: boolean;
}

/**
 * `isViewed` belongs to the applicant who received the interaction and
 * `isFavorite` to the recruiter who created it; neither side can write the
 * other's flag.
 */
export const updateInteraction = async (
  interactionId: string,
  actorId: string,
  patch: UpdateInteractionInput,
): Promise<InteractionDto> => {
  const existing = await prisma.interaction.findUnique({
    where: { id: interactionId },
    select: { createdById: true, recipientId: true },
  });

  if (!existing) throw notFound('Interaction introuvable');

  if (patch.isViewed !== undefined && existing.recipientId !== actorId) {
    throw forbidden("Seul le destinataire peut marquer l'interaction comme vue");
  }

  if (patch.isFavorite !== undefined && existing.createdById !== actorId) {
    throw forbidden("Seul l'auteur peut modifier ses favoris");
  }

  const row = await prisma.interaction.update({
    where: { id: interactionId },
    data: patch,
    select: interactionSelect,
  });

  return toInteractionDto(row, actorId);
};
