import { renderHook, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import type { Profile } from '@profils-actifs/shared';
import { useProfile } from '../../src/hooks/useProfile.js';

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

describe('useProfile', () => {
  it('fetches by id and exposes the profile on success', async () => {
    const getProfile = jest.fn().mockResolvedValue(baseProfile);

    const { result } = renderHook(() => useProfile('profile-1', getProfile));
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.profile).toEqual(baseProfile);
    expect(result.current.notFound).toBe(false);
    expect(result.current.error).toBeNull();
    expect(getProfile).toHaveBeenCalledWith('profile-1');
  });

  it('sets notFound (not error) when the service resolves null', async () => {
    const getProfile = jest.fn().mockResolvedValue(null);

    const { result } = renderHook(() => useProfile('missing', getProfile));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.notFound).toBe(true);
    expect(result.current.profile).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('sets error (not notFound) when the fetch itself fails', async () => {
    const getProfile = jest.fn().mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useProfile('profile-1', getProfile));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Impossible de charger ce profil pour le moment.');
    expect(result.current.notFound).toBe(false);
  });

  it('treats a missing id as not-found without calling the fetch function', () => {
    const getProfile = jest.fn();

    const { result } = renderHook(() => useProfile(undefined, getProfile));

    expect(result.current.loading).toBe(false);
    expect(result.current.notFound).toBe(true);
    expect(getProfile).not.toHaveBeenCalled();
  });
});
