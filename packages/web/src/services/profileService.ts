import type { CertificationStatus, Paginated, Profile } from '@profils-actifs/shared';
import { httpClient } from './httpClient.js';

/**
 * Mirrors the API's own `ProfileFeedFilters` (`profile.service.ts`) —
 * whatever a caller can narrow the feed by, independent of which page of
 * results they're on.
 */
export interface ProfileFeedFilters {
  sector?: string;
  location?: string;
  certificationStatus?: CertificationStatus;
}

export interface ProfileFeedParams extends ProfileFeedFilters {
  page: number;
  limit: number;
}

/**
 * `GET /profiles` — the public, paginated feed. A thin wrapper around
 * `httpClient`, kept as its own function (rather than called inline from
 * `useProfileFeed`) so the hook doesn't need to know anything about HTTP —
 * it depends on "a function that returns a page of profiles," which also
 * makes it trivial to substitute a fake one in tests.
 */
export async function fetchProfileFeed(params: ProfileFeedParams): Promise<Paginated<Profile>> {
  const { data } = await httpClient.get<Paginated<Profile>>('/profiles', { params });
  return data;
}
