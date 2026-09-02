import { jest } from '@jest/globals';
import type { Profile } from '@profils-actifs/shared';
import { httpClient } from '../../src/services/httpClient.js';
import { getProfileById } from '../../src/services/profiles.js';

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

describe('getProfileById', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the profile on success', async () => {
    jest.spyOn(httpClient, 'get').mockResolvedValue({ data: baseProfile });

    await expect(getProfileById('profile-1')).resolves.toEqual(baseProfile);
  });

  it('returns null for a 404, instead of throwing', async () => {
    jest.spyOn(httpClient, 'get').mockRejectedValue(fakeAxiosError(404));

    await expect(getProfileById('does-not-exist')).resolves.toBeNull();
  });

  it('re-throws a non-404 error rather than swallowing it', async () => {
    jest.spyOn(httpClient, 'get').mockRejectedValue(fakeAxiosError(500));

    await expect(getProfileById('profile-1')).rejects.toThrow();
  });
});
