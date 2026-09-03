import type {
  Paginated,
  Profile,
  ProfileInput,
  ProfileSkillInput,
  Skill,
} from '@profils-actifs/shared';
import { api, ApiError, toApiError } from './api.js';

/** `GET /profiles` — the public, paginated feed. */
export const fetchProfileFeed = async (
  page: number,
  signal?: AbortSignal,
): Promise<Paginated<Profile>> => {
  const response = await api.get<Paginated<Profile>>('/profiles', {
    params: page > 1 ? { page } : {},
    signal,
  });
  return response.data;
};

/** `GET /profiles/{id}` — public; the owner's token, when present, unlocks
 *  their own not-yet-approved profile. */
export const fetchProfile = async (id: string, signal?: AbortSignal): Promise<Profile> => {
  const response = await api.get<Profile>(`/profiles/${encodeURIComponent(id)}`, { signal });
  return response.data;
};

/**
 * `GET /profiles/me`. Resolves `null` on a 404: a brand-new applicant has no
 * profile yet, which is a normal state the form starts blank for, not an
 * error to show.
 */
export const fetchOwnProfile = async (signal?: AbortSignal): Promise<Profile | null> => {
  try {
    const response = await api.get<Profile>('/profiles/me', { signal });
    return response.data;
  } catch (cause: unknown) {
    const error = toApiError(cause);
    if (error instanceof ApiError && error.status === 404) return null;
    throw cause;
  }
};

/** `POST /profiles/me` — create-or-update. */
export const saveOwnProfile = async (input: ProfileInput): Promise<Profile> => {
  const response = await api.post<Profile>('/profiles/me', input);
  return response.data;
};

export const addOwnSkill = async (input: ProfileSkillInput): Promise<Profile> => {
  const response = await api.post<Profile>('/profiles/me/skills', input);
  return response.data;
};

export const removeOwnSkill = async (skillId: string): Promise<void> => {
  await api.delete(`/profiles/me/skills/${encodeURIComponent(skillId)}`);
};

/** `GET /skills` — the shared catalog, for the profile form's suggestions. */
export const fetchSkills = async (signal?: AbortSignal): Promise<Skill[]> => {
  const response = await api.get<Skill[]>('/skills', { signal });
  return response.data;
};
