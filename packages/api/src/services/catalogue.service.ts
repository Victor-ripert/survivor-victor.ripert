import { InteractionType, Prisma } from '@prisma/client';
import {
  buildPaginationMeta,
  resolvePageRequest,
  type CatalogueFacets,
  type CatalogueProfile,
  type CatalogueSort,
  type FacetValue,
  type PaginatedResponse,
} from '@profils-actifs/shared';
import { prisma } from '../config/prisma.js';
import {
  buildCatalogueOrderBy,
  buildCatalogueWhere,
  publishedVideoFilter,
  visibleProfileFilter,
  type CatalogueFilters,
} from './catalogue.filters.js';

const MAX_SKILLS_PER_ROW = 12;
const MAX_FACET_VALUES = 25;

const CONTACT_TYPES = [InteractionType.CONTACT, InteractionType.MESSAGE];

const catalogueSelect = {
  id: true,
  userId: true,
  headline: true,
  location: true,
  sector: true,
  certificationStatus: true,
  certificationScore: true,
  certificationBadge: true,
  updatedAt: true,
  user: { select: { firstName: true, lastName: true } },
  skills: {
    select: { level: true, skill: { select: { id: true, name: true } } },
    orderBy: { skill: { name: 'asc' } },
    take: MAX_SKILLS_PER_ROW,
  },
  videos: {
    where: publishedVideoFilter,
    select: { id: true, title: true, url: true },
    // `Video` has no `createdAt` (dropped by the video-consent migration —
    // see `Video.acceptedAt`, timestamped at submission, which is now the
    // closest equivalent of "when this video was added").
    orderBy: { acceptedAt: 'asc' },
    take: 1,
  },
  _count: { select: { videos: { where: publishedVideoFilter } } },
} satisfies Prisma.ProfileSelect;

type CatalogueRow = Prisma.ProfileGetPayload<{ select: typeof catalogueSelect }>;

const toCatalogueProfile = (
  row: CatalogueRow,
  favoriteUserIds: ReadonlySet<string>,
  lastContactedAt: ReadonlyMap<string, Date>,
): CatalogueProfile => ({
  id: row.id,
  userId: row.userId,
  firstName: row.user.firstName,
  lastName: row.user.lastName,
  headline: row.headline,
  location: row.location,
  sector: row.sector,
  certificationStatus: row.certificationStatus,
  certificationScore: row.certificationScore,
  certificationBadge: row.certificationBadge,
  skills: row.skills.map((entry) => ({
    id: entry.skill.id,
    name: entry.skill.name,
    level: entry.level,
  })),
  videoCount: row._count.videos,
  previewVideo: row.videos[0] ?? null,
  isFavorite: favoriteUserIds.has(row.userId),
  lastContactedAt: lastContactedAt.get(row.userId)?.toISOString() ?? null,
  updatedAt: row.updatedAt.toISOString(),
});

/** Applicant ids the recruiter currently keeps as favourites. */
export const listFavoriteUserIds = async (recruiterId: string): Promise<string[]> => {
  const rows = await prisma.interaction.findMany({
    where: { createdById: recruiterId, type: InteractionType.FAVORITE, isFavorite: true },
    select: { recipientId: true },
    distinct: ['recipientId'],
  });

  return rows.map((row) => row.recipientId);
};

const fetchFavoriteFlags = async (recruiterId: string, userIds: string[]): Promise<Set<string>> => {
  const rows = await prisma.interaction.findMany({
    where: {
      createdById: recruiterId,
      recipientId: { in: userIds },
      type: InteractionType.FAVORITE,
      isFavorite: true,
    },
    select: { recipientId: true },
    distinct: ['recipientId'],
  });

  return new Set(rows.map((row) => row.recipientId));
};

const fetchLastContactedAt = async (
  recruiterId: string,
  userIds: string[],
): Promise<Map<string, Date>> => {
  const rows = await prisma.interaction.groupBy({
    by: ['recipientId'],
    where: {
      createdById: recruiterId,
      recipientId: { in: userIds },
      type: { in: CONTACT_TYPES },
    },
    _max: { createdAt: true },
  });

  return new Map(
    rows.flatMap((row) => (row._max.createdAt ? [[row.recipientId, row._max.createdAt]] : [])),
  );
};

export interface CatalogueRequest {
  recruiterId: string;
  filters: CatalogueFilters;
  sort: CatalogueSort;
  page?: number;
  limit?: number;
  favoritesOnly?: boolean;
}

const emptyPage = (
  pageRequest: ReturnType<typeof resolvePageRequest>,
): PaginatedResponse<CatalogueProfile> => ({
  data: [],
  pagination: buildPaginationMeta(0, pageRequest),
});

export const listCatalogue = async ({
  recruiterId,
  filters,
  sort,
  page,
  limit,
  favoritesOnly = false,
}: CatalogueRequest): Promise<PaginatedResponse<CatalogueProfile>> => {
  const pageRequest = resolvePageRequest(page, limit);

  let restrictToUserIds = filters.restrictToUserIds;
  if (favoritesOnly) {
    const favorites = await listFavoriteUserIds(recruiterId);
    if (favorites.length === 0) return emptyPage(pageRequest);
    restrictToUserIds = restrictToUserIds
      ? restrictToUserIds.filter((id) => favorites.includes(id))
      : favorites;
  }

  const where = buildCatalogueWhere({ ...filters, restrictToUserIds });

  const [rows, total] = await prisma.$transaction([
    prisma.profile.findMany({
      where,
      select: catalogueSelect,
      orderBy: buildCatalogueOrderBy(sort),
      skip: pageRequest.skip,
      take: pageRequest.limit,
    }),
    prisma.profile.count({ where }),
  ]);

  if (rows.length === 0) {
    return { data: [], pagination: buildPaginationMeta(total, pageRequest) };
  }

  // Two batched lookups keyed on the page's ids, so the number of queries does
  // not grow with the number of rows.
  const userIds = rows.map((row) => row.userId);
  const [favoriteUserIds, lastContactedAt] = await Promise.all([
    favoritesOnly ? Promise.resolve(new Set(userIds)) : fetchFavoriteFlags(recruiterId, userIds),
    fetchLastContactedAt(recruiterId, userIds),
  ]);

  return {
    data: rows.map((row) => toCatalogueProfile(row, favoriteUserIds, lastContactedAt)),
    pagination: buildPaginationMeta(total, pageRequest),
  };
};

const toFacetValues = (rows: { value: string | null; count: number }[]): FacetValue[] =>
  rows
    .flatMap((row) => (row.value ? [{ value: row.value, count: row.count }] : []))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'fr'));

/**
 * Filter values that currently match at least one visible profile, so the UI
 * never offers a dropdown entry that returns nothing.
 */
export const getCatalogueFacets = async (): Promise<CatalogueFacets> => {
  const [sectors, locations, skills] = await Promise.all([
    prisma.profile.groupBy({
      by: ['sector'],
      where: visibleProfileFilter,
      _count: { _all: true },
      orderBy: { _count: { sector: 'desc' } },
      take: MAX_FACET_VALUES,
    }),
    prisma.profile.groupBy({
      by: ['location'],
      where: visibleProfileFilter,
      _count: { _all: true },
      orderBy: { _count: { location: 'desc' } },
      take: MAX_FACET_VALUES,
    }),
    prisma.skill.findMany({
      where: { profiles: { some: { profile: visibleProfileFilter } } },
      select: {
        name: true,
        _count: { select: { profiles: { where: { profile: visibleProfileFilter } } } },
      },
      orderBy: { profiles: { _count: 'desc' } },
      take: MAX_FACET_VALUES,
    }),
  ]);

  return {
    sectors: toFacetValues(sectors.map((row) => ({ value: row.sector, count: row._count._all }))),
    locations: toFacetValues(
      locations.map((row) => ({ value: row.location, count: row._count._all })),
    ),
    skills: toFacetValues(skills.map((row) => ({ value: row.name, count: row._count.profiles }))),
  };
};
