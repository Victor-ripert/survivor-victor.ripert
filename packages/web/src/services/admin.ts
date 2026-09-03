import type {
  ModerationAction,
  Paginated,
  PaginationParams,
  Profile,
} from '@profils-actifs/shared';
import { api } from './api.js';

export interface ModerateProfileInput {
  action: ModerationAction;
  reason?: string;
  notes?: string;
}

/**
 * `GET /admin/moderation/profiles`, admin only — the review queue, oldest
 * submission first. `api`'s interceptor attaches the bearer token; a
 * non-admin (or anonymous) caller gets a 401/403 from the API regardless
 * of anything the frontend does — see `ModerationQueuePage`'s own gate for
 * why that frontend check exists anyway (defense in depth, not a
 * replacement).
 */
export async function fetchPendingProfiles(params: PaginationParams): Promise<Paginated<Profile>> {
  const { data } = await api.get<Paginated<Profile>>('/admin/moderation/profiles', { params });
  return data;
}

/** `POST /admin/profiles/{id}/moderate`, admin only. */
export async function moderateProfile(
  profileId: string,
  input: ModerateProfileInput,
): Promise<void> {
  await api.post(`/admin/profiles/${profileId}/moderate`, input);
}
