import { useCallback, useEffect, useState } from 'react';
import { ApiError, toApiError } from '../services/api.js';

export interface AsyncResource<T> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
  reload: () => void;
}

interface Settled<T> {
  /** Identifies the request this outcome came from. */
  source: unknown;
  token: number;
  data: T | null;
  error: ApiError | null;
}

/**
 * Runs a request tied to the component's lifetime: a new call aborts the
 * previous one and a late response is dropped, so switching filters quickly can
 * never render stale results. The previous page stays on screen while the next
 * one loads, which avoids a flash of empty layout between two filter changes.
 *
 * `load` must be stable (wrap it in `useCallback`) — it is the dependency that
 * decides when the request runs again. Loading is derived from which request
 * has settled rather than set from inside the effect, so a request never costs
 * an extra render pass.
 */
export const useAsyncResource = <T>(
  load: (signal: AbortSignal) => Promise<T>,
): AsyncResource<T> => {
  const [reloadToken, setReloadToken] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setSettled({ source: load, token: reloadToken, data, error: null });
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setSettled({ source: load, token: reloadToken, data: null, error: toApiError(cause) });
        }
      });

    return () => controller.abort();
  }, [load, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return {
    data: settled?.data ?? null,
    error: settled?.error ?? null,
    isLoading: settled === null || settled.source !== load || settled.token !== reloadToken,
    reload,
  };
};
