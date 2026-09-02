import { useEffect, useState } from 'react';
import type { Profile } from '@profils-actifs/shared';
import { getProfileById } from '../services/profiles.js';

type GetProfileById = (id: string) => ReturnType<typeof getProfileById>;

export interface UseProfileResult {
  profile: Profile | null;
  loading: boolean;
  /** True once loading has finished and the profile genuinely doesn't exist (or isn't visible to this caller) — distinct from `error`. */
  notFound: boolean;
  error: string | null;
}

/**
 * Owns fetching state for a single profile by id — the same
 * loading/error-handling shape `useProfileFeed` uses for the list version,
 * so both pages behave consistently and neither reimplements the other's
 * bookkeeping. `getProfile` defaults to the real `getProfileById` and, like
 * `useProfileFeed`'s equivalent parameter, exists so this hook is testable
 * with a fake in place of a real HTTP call.
 *
 * `notFound` is kept separate from `error`: a 404 here means "this profile
 * doesn't exist, or isn't approved yet, and I'm not its owner" — a normal,
 * expected outcome the page should show a plain empty state for — while
 * `error` means the request itself failed (network down, server error),
 * which deserves a different message.
 */
export function useProfile(
  id: string | undefined,
  getProfile: GetProfileById = getProfileById,
): UseProfileResult {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundFromFetch, setNotFoundFromFetch] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // No `id` (e.g. a malformed route) means there's nothing to fetch —
    // handled as a derived return value below instead of stored state, so
    // this branch never needs to call a setter at all.
    if (!id) {
      return;
    }
    const profileId = id;

    let isCurrent = true;

    async function run(): Promise<void> {
      setLoading(true);
      setError(null);
      setNotFoundFromFetch(false);

      try {
        const result = await getProfile(profileId);
        if (!isCurrent) return;
        if (result === null) {
          setNotFoundFromFetch(true);
        } else {
          setProfile(result);
        }
      } catch {
        if (!isCurrent) return;
        setError('Impossible de charger ce profil pour le moment.');
      } finally {
        if (isCurrent) setLoading(false);
      }
    }

    void run();

    return () => {
      isCurrent = false;
    };
  }, [id, getProfile]);

  if (!id) {
    return { profile: null, loading: false, notFound: true, error: null };
  }

  return { profile, loading, notFound: notFoundFromFetch, error };
}
