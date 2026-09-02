import { useCallback, useEffect } from 'react';
import { fetchNotifications } from '../services/notifications.js';
import { useAsyncResource } from './useAsyncResource.js';

const REFRESH_INTERVAL_MS = 90_000;

/**
 * The unread count behind the header badge. Polled, not pushed — the brief
 * rules out WebSockets — at a pace that stays well inside the API's request
 * budget even with several tabs open.
 */
export const useUnreadNotifications = (enabled: boolean): number => {
  const load = useCallback(
    async (signal: AbortSignal) => (enabled ? (await fetchNotifications(1, signal)).unread : 0),
    [enabled],
  );
  const { data, reload } = useAsyncResource(load);

  useEffect(() => {
    if (!enabled) return;

    const timer = window.setInterval(reload, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [enabled, reload]);

  return data ?? 0;
};
