import { CATALOGUE_SORTS, type CatalogueQuery, type CatalogueSort } from '@profils-actifs/shared';

const isSort = (value: string | null): value is CatalogueSort =>
  value !== null && (CATALOGUE_SORTS as readonly string[]).includes(value);

const readNumber = (raw: string | null): number | undefined => {
  if (raw === null || raw.trim() === '') return undefined;

  const parsed = Number(raw);

  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * The URL is the single source of truth for the catalogue's filters: a filtered
 * view can be shared, bookmarked and restored by the back button, and no
 * component has to keep a second copy of the state in sync.
 */
export const parseCatalogueParams = (params: URLSearchParams): CatalogueQuery => {
  const skills = params.get('skills');
  const sort = params.get('sort');

  return {
    page: readNumber(params.get('page')) ?? 1,
    q: params.get('q') ?? undefined,
    sector: params.get('sector') ?? undefined,
    location: params.get('location') ?? undefined,
    skills: skills ? skills.split(',').filter((entry) => entry.length > 0) : undefined,
    certifiedOnly: params.get('certifiedOnly') === 'true' || undefined,
    minScore: readNumber(params.get('minScore')),
    hasVideo: params.get('hasVideo') === 'true' || undefined,
    sort: isSort(sort) ? sort : 'recent',
  };
};

/** Only non-default values are written back, so a pristine catalogue keeps a
 *  clean URL. */
export const toCatalogueParams = (query: CatalogueQuery): URLSearchParams => {
  const params = new URLSearchParams();

  if (query.page && query.page > 1) params.set('page', String(query.page));
  if (query.q) params.set('q', query.q);
  if (query.sector) params.set('sector', query.sector);
  if (query.location) params.set('location', query.location);
  if (query.skills?.length) params.set('skills', query.skills.join(','));
  if (query.certifiedOnly) params.set('certifiedOnly', 'true');
  if (query.minScore !== undefined) params.set('minScore', String(query.minScore));
  if (query.hasVideo) params.set('hasVideo', 'true');
  if (query.sort && query.sort !== 'recent') params.set('sort', query.sort);

  return params;
};

export const countActiveFilters = (query: CatalogueQuery): number =>
  [
    query.q,
    query.sector,
    query.location,
    query.skills?.length ? query.skills : undefined,
    query.certifiedOnly,
    query.minScore,
    query.hasVideo,
  ].filter((value) => value !== undefined && value !== false).length;
