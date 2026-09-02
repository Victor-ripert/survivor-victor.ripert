import type {
  AdminDashboard,
  ModerationAction,
  Paginated,
  PaginatedResponse,
  Profile,
  VideoModerationInput,
  VideoModerationItem,
  VideoModerationQuery,
} from '@profils-actifs/shared';
import { api } from './api.js';

export const fetchAdminDashboard = async (signal?: AbortSignal): Promise<AdminDashboard> => {
  const response = await api.get<AdminDashboard>('/admin/dashboard', { signal });
  return response.data;
};

/** `GET /admin/moderation/profiles` — the review queue, oldest first. */
export const fetchPendingProfiles = async (
  page: number,
  signal?: AbortSignal,
): Promise<Paginated<Profile>> => {
  const response = await api.get<Paginated<Profile>>('/admin/moderation/profiles', {
    params: page > 1 ? { page } : {},
    signal,
  });
  return response.data;
};

export interface ModerateProfileInput {
  action: ModerationAction;
  reason?: string;
  notes?: string;
}

export const moderateProfile = async (
  profileId: string,
  input: ModerateProfileInput,
): Promise<void> => {
  await api.post(`/admin/profiles/${encodeURIComponent(profileId)}/moderate`, input);
};

/** Video moderation queue — brief §7.9.2. */
export const fetchVideoModerationQueue = async (
  query: VideoModerationQuery,
  signal?: AbortSignal,
): Promise<PaginatedResponse<VideoModerationItem>> => {
  const params: Record<string, string> = {};
  if (query.page && query.page > 1) params.page = String(query.page);
  if (query.status) params.status = query.status;

  const response = await api.get<PaginatedResponse<VideoModerationItem>>(
    '/admin/moderation/videos',
    { params, signal },
  );
  return response.data;
};

export const moderateVideo = async (
  videoId: string,
  decision: VideoModerationInput,
): Promise<VideoModerationItem> => {
  const response = await api.post<VideoModerationItem>(
    `/admin/videos/${encodeURIComponent(videoId)}/moderate`,
    decision,
  );
  return response.data;
};
