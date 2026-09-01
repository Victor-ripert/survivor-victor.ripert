import { CertificationStatus, InteractionType, ModerationStatus, UserRole } from '@prisma/client';
import {
  DASHBOARD_TREND_DAYS,
  fillDailySeries,
  type AdminDashboard,
  type DailyCount,
  type LabelledCount,
  type RecruiterDashboard,
} from '@profils-actifs/shared';
import { prisma } from '../config/prisma.js';
import { listInteractions } from './interaction.service.js';

const MESSAGE_TYPES = [InteractionType.CONTACT, InteractionType.MESSAGE];
const TOP_SECTORS = 6;
const RECENT_CONTACTS = 5;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

interface DailyRow {
  day: string;
  count: number;
}

/** Start of the oldest UTC day still inside the trend window. */
const trendWindowStart = (now: Date): Date =>
  new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
      (DASHBOARD_TREND_DAYS - 1) * MILLISECONDS_PER_DAY,
  );

const toSeries = (rows: DailyRow[], now: Date): DailyCount[] =>
  fillDailySeries(new Map(rows.map((row) => [row.day, row.count])), DASHBOARD_TREND_DAYS, now);

const toLabelledCounts = (rows: { label: string; count: number }[]): LabelledCount[] =>
  rows.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr'));

const ratio = (part: number, whole: number): number =>
  whole === 0 ? 0 : Math.round((part / whole) * 1000) / 1000;

export const getRecruiterDashboard = async (
  recruiterId: string,
  now: Date = new Date(),
): Promise<RecruiterDashboard> => {
  const since = trendWindowStart(now);

  const [byType, viewedApplicants, favorites, reachedApplicants, activityRows, recentContacts] =
    await Promise.all([
      prisma.interaction.groupBy({
        by: ['type'],
        where: { createdById: recruiterId },
        _count: { _all: true },
      }),
      prisma.interaction.groupBy({
        by: ['recipientId'],
        where: { createdById: recruiterId, type: InteractionType.VIEW },
      }),
      prisma.interaction.count({
        where: { createdById: recruiterId, type: InteractionType.FAVORITE, isFavorite: true },
      }),
      prisma.interaction.groupBy({
        by: ['recipientId'],
        where: { createdById: recruiterId, type: { in: MESSAGE_TYPES } },
      }),
      prisma.$queryRaw<DailyRow[]>`
        SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS "day",
               COUNT(*)::int AS "count"
        FROM "Interaction"
        WHERE "createdById" = ${recruiterId} AND "createdAt" >= ${since}
        GROUP BY 1
        ORDER BY 1
      `,
      listInteractions({
        viewerId: recruiterId,
        direction: 'sent',
        types: MESSAGE_TYPES,
        limit: RECENT_CONTACTS,
      }),
    ]);

  const reachedIds = reachedApplicants.map((row) => row.recipientId);

  const [certifiedReached, topSectorsReached] = await Promise.all([
    reachedIds.length === 0
      ? Promise.resolve(0)
      : prisma.profile.count({
          where: {
            userId: { in: reachedIds },
            certificationStatus: CertificationStatus.COMPLETED,
          },
        }),
    reachedIds.length === 0
      ? Promise.resolve([])
      : prisma.profile.groupBy({
          by: ['sector'],
          where: { userId: { in: reachedIds } },
          _count: { _all: true },
          orderBy: { _count: { sector: 'desc' } },
          take: TOP_SECTORS,
        }),
  ]);

  const countByType = new Map(byType.map((row) => [row.type, row._count._all]));
  const contactsSent = MESSAGE_TYPES.reduce(
    (total, type) => total + (countByType.get(type) ?? 0),
    0,
  );

  return {
    totals: {
      profilesViewed: viewedApplicants.length,
      contactsSent,
      favorites,
      applicantsReached: reachedIds.length,
    },
    certifiedShare: ratio(certifiedReached, reachedIds.length),
    activityLast30Days: toSeries(activityRows, now),
    interactionsByType: toLabelledCounts(
      byType.map((row) => ({ label: row.type, count: row._count._all })),
    ),
    topSectorsReached: toLabelledCounts(
      topSectorsReached.map((row) => ({ label: row.sector, count: row._count._all })),
    ),
    recentContacts: recentContacts.data,
  };
};

export const getAdminDashboard = async (now: Date = new Date()): Promise<AdminDashboard> => {
  const since = trendWindowStart(now);

  const [
    totalProfiles,
    activeApplicants,
    totalRecruiters,
    totalInteractions,
    pendingModeration,
    certifiedProfiles,
    usersByRole,
    profilesByCertificationStatus,
    interactionsByType,
    topSectors,
    signupRows,
    interactionRows,
  ] = await Promise.all([
    prisma.profile.count(),
    prisma.user.count({ where: { role: UserRole.APPLICANT, isActive: true } }),
    prisma.user.count({ where: { role: UserRole.RECRUITER, isActive: true } }),
    prisma.interaction.count(),
    prisma.profile.count({ where: { moderationStatus: ModerationStatus.PENDING } }),
    prisma.profile.count({ where: { certificationStatus: CertificationStatus.COMPLETED } }),
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.profile.groupBy({ by: ['certificationStatus'], _count: { _all: true } }),
    prisma.interaction.groupBy({ by: ['type'], _count: { _all: true } }),
    prisma.profile.groupBy({
      by: ['sector'],
      _count: { _all: true },
      orderBy: { _count: { sector: 'desc' } },
      take: TOP_SECTORS,
    }),
    prisma.$queryRaw<DailyRow[]>`
      SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS "day",
             COUNT(*)::int AS "count"
      FROM "User"
      WHERE "createdAt" >= ${since}
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.$queryRaw<DailyRow[]>`
      SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS "day",
             COUNT(*)::int AS "count"
      FROM "Interaction"
      WHERE "createdAt" >= ${since}
      GROUP BY 1
      ORDER BY 1
    `,
  ]);

  return {
    totals: {
      totalProfiles,
      activeApplicants,
      totalRecruiters,
      totalInteractions,
      pendingModeration,
    },
    certificationRate: ratio(certifiedProfiles, totalProfiles),
    usersByRole: toLabelledCounts(
      usersByRole.map((row) => ({ label: row.role, count: row._count._all })),
    ),
    profilesByCertificationStatus: toLabelledCounts(
      profilesByCertificationStatus.map((row) => ({
        label: row.certificationStatus,
        count: row._count._all,
      })),
    ),
    interactionsByType: toLabelledCounts(
      interactionsByType.map((row) => ({ label: row.type, count: row._count._all })),
    ),
    topSectors: toLabelledCounts(
      topSectors.map((row) => ({ label: row.sector, count: row._count._all })),
    ),
    signupsLast30Days: toSeries(signupRows, now),
    interactionsLast30Days: toSeries(interactionRows, now),
  };
};
