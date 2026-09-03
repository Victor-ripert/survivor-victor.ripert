import { jest } from '@jest/globals';
import type { Profile } from '@profils-actifs/shared';
import { api, ApiError } from '../../src/services/api.js';
import {
  addOwnSkill,
  fetchOwnProfile,
  fetchProfileFeed,
  saveOwnProfile,
} from '../../src/services/profiles.js';

const baseProfile: Profile = {
  id: 'profile-1',
  userId: 'user-1',
  firstName: 'Amina',
  lastName: 'Berthier',
  location: 'Lyon',
  sector: 'Informatique',
  skills: [],
  videos: [],
  certificationStatus: 'PENDING',
  moderationStatus: 'APPROVED',
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('fetchProfileFeed', () => {
  it('keeps the first page out of the query string', async () => {
    jest.spyOn(api, 'get').mockResolvedValue({
      data: { data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } },
    });

    await fetchProfileFeed(1);
    expect(api.get).toHaveBeenCalledWith('/profiles', { params: {}, signal: undefined });

    await fetchProfileFeed(3);
    expect(api.get).toHaveBeenLastCalledWith('/profiles', {
      params: { page: 3 },
      signal: undefined,
    });
  });
});

describe('fetchOwnProfile', () => {
  it('returns the profile on success', async () => {
    jest.spyOn(api, 'get').mockResolvedValue({ data: baseProfile });

    await expect(fetchOwnProfile()).resolves.toEqual(baseProfile);
  });

  it('resolves null for a 404 — a brand-new applicant with no profile yet', async () => {
    jest.spyOn(api, 'get').mockRejectedValue(new ApiError(404, 'not_found', 'Profil introuvable'));

    await expect(fetchOwnProfile()).resolves.toBeNull();
  });

  it('re-throws any other failure', async () => {
    jest.spyOn(api, 'get').mockRejectedValue(new ApiError(500, 'internal_error', 'Erreur interne'));

    await expect(fetchOwnProfile()).rejects.toThrow('Erreur interne');
  });
});

describe('mutations', () => {
  it('posts the profile form to /profiles/me', async () => {
    jest.spyOn(api, 'post').mockResolvedValue({ data: baseProfile });
    const input = { headline: '', bio: '', location: 'Lyon', sector: 'Informatique' };

    await expect(saveOwnProfile(input)).resolves.toEqual(baseProfile);
    expect(api.post).toHaveBeenCalledWith('/profiles/me', input);
  });

  it('tags a skill by name', async () => {
    jest.spyOn(api, 'post').mockResolvedValue({ data: baseProfile });

    await addOwnSkill({ skillName: 'React', level: 'ADVANCED' });
    expect(api.post).toHaveBeenCalledWith('/profiles/me/skills', {
      skillName: 'React',
      level: 'ADVANCED',
    });
  });
});
