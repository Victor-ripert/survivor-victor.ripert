import axios from 'axios';
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

/**
 * `GET /profiles/{id}` — a single public profile, no auth required (the
 * brief requires profiles to be viewable without a recruiter account).
 *
 * Returns `null` specifically for a 404, rather than throwing for every
 * failure alike, so a caller can tell "this profile genuinely doesn't
 * exist, or isn't visible to me" apart from "something went wrong talking
 * to the API" — `ProfilePage` shows a different message for each rather
 * than collapsing both into one generic error state.
 */
export async function getProfileById(id: string): Promise<Profile | null> {
  try {
    const { data } = await httpClient.get<Profile>(`/profiles/${id}`);
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return null;
    }
    throw err;
  }
}
