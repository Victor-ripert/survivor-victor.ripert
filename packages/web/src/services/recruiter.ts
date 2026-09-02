import type {
  AdminDashboard,
  CatalogueFacets,
  CatalogueProfile,
  CatalogueQuery,
  InteractionDto,
  PaginatedResponse,
  RecruiterDashboard,
} from '@profils-actifs/shared';
import { api } from './api.js';

/** Axios would serialise arrays as `skills[]=a`; the API reads a repeated or
 *  comma-separated `skills`, so the list is joined here. */
const toParams = (query: CatalogueQuery): Record<string, string> => {
  const params: Record<string, string> = {};

  if (query.page && query.page > 1) params.page = String(query.page);
  if (query.limit) params.limit = String(query.limit);
  if (query.q) params.q = query.q;
  if (query.sector) params.sector = query.sector;
  if (query.location) params.location = query.location;
  if (query.skills?.length) params.skills = query.skills.join(',');
  if (query.certifiedOnly) params.certifiedOnly = 'true';
  if (query.minScore !== undefined) params.minScore = String(query.minScore);
  if (query.hasVideo) params.hasVideo = 'true';
  if (query.sort) params.sort = query.sort;

  return params;
};

export const fetchCatalogue = async (
  query: CatalogueQuery,
  signal?: AbortSignal,
): Promise<PaginatedResponse<CatalogueProfile>> => {
  const response = await api.get<PaginatedResponse<CatalogueProfile>>('/recruiter/catalogue', {
    params: toParams(query),
    signal,
  });

  return response.data;
};

export const fetchFavorites = async (
  query: CatalogueQuery,
  signal?: AbortSignal,
): Promise<PaginatedResponse<CatalogueProfile>> => {
  const response = await api.get<PaginatedResponse<CatalogueProfile>>('/recruiter/favorites', {
    params: toParams(query),
    signal,
  });

  return response.data;
};

export const fetchFacets = async (signal?: AbortSignal): Promise<CatalogueFacets> => {
  const response = await api.get<CatalogueFacets>('/recruiter/catalogue/facets', { signal });

  return response.data;
};

export const fetchRecruiterDashboard = async (
  signal?: AbortSignal,
): Promise<RecruiterDashboard> => {
  const response = await api.get<RecruiterDashboard>('/recruiter/dashboard', { signal });

  return response.data;
};

export const fetchAdminDashboard = async (signal?: AbortSignal): Promise<AdminDashboard> => {
  const response = await api.get<AdminDashboard>('/admin/dashboard', { signal });

  return response.data;
};

export const fetchSentInteractions = async (
  page: number,
  signal?: AbortSignal,
): Promise<PaginatedResponse<InteractionDto>> => {
  const response = await api.get<PaginatedResponse<InteractionDto>>('/interactions', {
    params: { direction: 'sent', page: String(page) },
    signal,
  });

  return response.data;
};

export const addFavorite = async (applicantId: string): Promise<void> => {
  await api.put(`/recruiter/favorites/${encodeURIComponent(applicantId)}`);
};

export const removeFavorite = async (applicantId: string): Promise<void> => {
  await api.delete(`/recruiter/favorites/${encodeURIComponent(applicantId)}`);
};

/** Recorded when a recruiter opens a pitch video: that is the moment a profile
 *  was actually consulted, and repeats within 24h collapse server-side. */
export const recordProfileView = async (applicantId: string): Promise<void> => {
  await api.post('/interactions', { recipientId: applicantId, type: 'VIEW' });
};

export const sendContact = async (applicantId: string, message: string): Promise<void> => {
  await api.post('/interactions', { recipientId: applicantId, type: 'CONTACT', message });
};
