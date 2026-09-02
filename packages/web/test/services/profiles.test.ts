import { jest } from '@jest/globals';
import type { Profile } from '@profils-actifs/shared';
import { api } from '../../src/services/api.js';
import { getMyProfile, getProfileById, upsertMyProfile } from '../../src/services/profiles.js';

const baseProfile: Profile = {
  id: 'profile-1',
  userId: 'user-1',
  location: 'Lyon',
  sector: 'Informatique',
  skills: [],
  videos: [],
  certificationStatus: 'PENDING',
  moderationStatus: 'APPROVED',
};

/** Minimal fake matching what `axios.isAxiosError` actually checks (`isAxiosError === true`), without depending on `AxiosError`'s full constructor shape. */
function fakeAxiosError(status: number): Error {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status },
  });
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('getProfileById', () => {
  it('returns the profile on success', async () => {
    jest.spyOn(api, 'get').mockResolvedValue({ data: baseProfile });

    await expect(getProfileById('profile-1')).resolves.toEqual(baseProfile);
  });

  it('returns null for a 404, instead of throwing', async () => {
    jest.spyOn(api, 'get').mockRejectedValue(fakeAxiosError(404));

    await expect(getProfileById('does-not-exist')).resolves.toBeNull();
  });

  it('re-throws a non-404 error rather than swallowing it', async () => {
    jest.spyOn(api, 'get').mockRejectedValue(fakeAxiosError(500));

    await expect(getProfileById('profile-1')).rejects.toThrow();
  });
});

describe('getMyProfile', () => {
  it('returns the profile on success', async () => {
    jest.spyOn(api, 'get').mockResolvedValue({ data: baseProfile });

    await expect(getMyProfile()).resolves.toEqual(baseProfile);
    expect(api.get).toHaveBeenCalledWith('/profiles/me');
  });

  it('returns null for a 404 — a brand-new applicant with no profile yet', async () => {
    jest.spyOn(api, 'get').mockRejectedValue(fakeAxiosError(404));

    await expect(getMyProfile()).resolves.toBeNull();
  });

  it('re-throws a non-404 error', async () => {
    jest.spyOn(api, 'get').mockRejectedValue(fakeAxiosError(500));

    await expect(getMyProfile()).rejects.toThrow();
  });
});

describe('upsertMyProfile', () => {
  it('posts the input and returns the saved profile', async () => {
    jest.spyOn(api, 'post').mockResolvedValue({ data: baseProfile });
    const input = { headline: '', bio: '', location: 'Lyon', sector: 'Informatique' };

    await expect(upsertMyProfile(input)).resolves.toEqual(baseProfile);
    expect(api.post).toHaveBeenCalledWith('/profiles/me', input);
  });
});
