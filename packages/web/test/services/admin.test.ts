import { jest } from '@jest/globals';
import type { Paginated, Profile } from '@profils-actifs/shared';
import { api } from '../../src/services/api.js';
import { fetchPendingProfiles, moderateProfile } from '../../src/services/admin.js';

const pendingProfile: Profile = {
  id: 'profile-1',
  userId: 'user-1',
  location: 'Lyon',
  sector: 'Informatique',
  skills: [],
  videos: [],
  certificationStatus: 'PENDING',
  moderationStatus: 'PENDING',
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('fetchPendingProfiles', () => {
  it('requests the admin moderation queue with the given pagination', async () => {
    const page: Paginated<Profile> = {
      data: [pendingProfile],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 },
    };
    jest.spyOn(api, 'get').mockResolvedValue({ data: page });

    await expect(fetchPendingProfiles({ page: 1, limit: 20 })).resolves.toEqual(page);
    expect(api.get).toHaveBeenCalledWith('/admin/moderation/profiles', {
      params: { page: 1, limit: 20 },
    });
  });
});

describe('moderateProfile', () => {
  it('posts the action, reason and notes to the moderate endpoint', async () => {
    jest.spyOn(api, 'post').mockResolvedValue({ data: { message: 'Profile moderated' } });

    await moderateProfile('profile-1', {
      action: 'APPROVE',
      reason: 'Looks good',
      notes: undefined,
    });

    expect(api.post).toHaveBeenCalledWith('/admin/profiles/profile-1/moderate', {
      action: 'APPROVE',
      reason: 'Looks good',
      notes: undefined,
    });
  });
});
