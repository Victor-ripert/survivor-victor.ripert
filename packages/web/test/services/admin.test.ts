import { jest } from '@jest/globals';
import { api } from '../../src/services/api.js';
import {
  fetchVideoModerationQueue,
  moderateProfile,
  moderateVideo,
} from '../../src/services/admin.js';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('moderateProfile', () => {
  it('posts the action, reason and notes to the moderate endpoint', async () => {
    jest.spyOn(api, 'post').mockResolvedValue({ data: { message: 'Profil modéré' } });

    await moderateProfile('profile-1', { action: 'APPROVE', reason: 'Conforme' });

    expect(api.post).toHaveBeenCalledWith('/admin/profiles/profile-1/moderate', {
      action: 'APPROVE',
      reason: 'Conforme',
    });
  });
});

describe('video moderation', () => {
  it('asks for the pending queue by default and forwards the status filter', async () => {
    jest.spyOn(api, 'get').mockResolvedValue({
      data: { data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } },
    });

    await fetchVideoModerationQueue({ status: 'REJECTED', page: 2 });

    expect(api.get).toHaveBeenCalledWith('/admin/moderation/videos', {
      params: { page: '2', status: 'REJECTED' },
      signal: undefined,
    });
  });

  it('posts a decision with its mandatory reason', async () => {
    jest.spyOn(api, 'post').mockResolvedValue({ data: { id: 'video-1' } });

    await moderateVideo('video-1', { action: 'REJECT', reason: 'Le son est inaudible' });

    expect(api.post).toHaveBeenCalledWith('/admin/videos/video-1/moderate', {
      action: 'REJECT',
      reason: 'Le son est inaudible',
    });
  });
});
