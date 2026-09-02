import { act, renderHook, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import type { Paginated, Profile } from '@profils-actifs/shared';
import { useProfileFeed } from '../../src/hooks/useProfileFeed.js';

function makeProfile(id: string): Profile {
  return {
    id,
    userId: `user-${id}`,
    location: 'Lyon',
    sector: 'Informatique',
    skills: [],
    videos: [],
    certificationStatus: 'PENDING',
    moderationStatus: 'APPROVED',
  };
}

function makePage(profiles: Profile[], page: number, total: number): Paginated<Profile> {
  return {
    data: profiles,
    pagination: { page, limit: 20, total, pages: Math.max(1, Math.ceil(total / 20)) },
  };
}

describe('useProfileFeed', () => {
  it('fetches page 1 on mount and exposes the result', async () => {
    const fetchFeed = jest.fn().mockResolvedValue(makePage([makeProfile('a')], 1, 1));

    const { result } = renderHook(() => useProfileFeed({}, fetchFeed));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.profiles).toHaveLength(1);
    expect(result.current.pagination).toEqual({ page: 1, limit: 20, total: 1, pages: 1 });
    expect(result.current.error).toBeNull();
    expect(fetchFeed).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      sector: undefined,
      location: undefined,
      certificationStatus: undefined,
    });
  });

  it('passes filters straight through to the fetch function', async () => {
    const fetchFeed = jest.fn().mockResolvedValue(makePage([], 1, 0));

    renderHook(() => useProfileFeed({ sector: 'Informatique', location: 'Lyon' }, fetchFeed));

    await waitFor(() => expect(fetchFeed).toHaveBeenCalled());
    expect(fetchFeed).toHaveBeenCalledWith(
      expect.objectContaining({ sector: 'Informatique', location: 'Lyon' }),
    );
  });

  it('surfaces a French error message when the fetch fails, without crashing', async () => {
    const fetchFeed = jest.fn().mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useProfileFeed({}, fetchFeed));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Impossible de charger les profils pour le moment.');
    expect(result.current.profiles).toEqual([]);
  });

  it('refetches with the new page when setPage is called', async () => {
    const fetchFeed = jest.fn().mockResolvedValue(makePage([makeProfile('a')], 1, 40));

    const { result } = renderHook(() => useProfileFeed({}, fetchFeed));
    await waitFor(() => expect(result.current.loading).toBe(false));

    fetchFeed.mockResolvedValue(makePage([makeProfile('b')], 2, 40));

    act(() => {
      result.current.setPage(2);
    });

    await waitFor(() =>
      expect(fetchFeed).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })),
    );
    await waitFor(() => expect(result.current.profiles[0]?.id).toBe('b'));
  });

  it('resets back to page 1 when a filter changes', async () => {
    const fetchFeed = jest.fn().mockResolvedValue(makePage([makeProfile('a')], 1, 40));

    const { result, rerender } = renderHook(
      ({ filters }: { filters: { sector?: string } }) => useProfileFeed(filters, fetchFeed),
      { initialProps: { filters: { sector: 'Informatique' } } },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setPage(2);
    });
    await waitFor(() => expect(result.current.page).toBe(2));

    rerender({ filters: { sector: 'Santé' } });

    await waitFor(() => expect(result.current.page).toBe(1));
    await waitFor(() =>
      expect(fetchFeed).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, sector: 'Santé' }),
      ),
    );
  });
});
