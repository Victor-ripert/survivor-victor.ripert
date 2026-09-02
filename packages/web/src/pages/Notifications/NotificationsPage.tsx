import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Notification } from '@profils-actifs/shared';
import { Pagination } from '../../components/Pagination.js';
import { EmptyState, ErrorNotice, LoadingRow, Notice } from '../../components/StatusMessages.js';
import { useAsyncResource } from '../../hooks/useAsyncResource.js';
import { toApiError } from '../../services/api.js';
import { fetchNotifications, markNotificationRead } from '../../services/notifications.js';
import { formatDateTime, pluralize } from '../../utils/format.js';

export const NotificationsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1') || 1;

  const load = useCallback((signal: AbortSignal) => fetchNotifications(page, signal), [page]);
  const { data, error, isLoading, reload } = useAsyncResource(load);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);

  const markRead = async (notification: Notification): Promise<void> => {
    if (notification.isRead || readIds.has(notification.id)) return;

    setReadIds((current) => new Set(current).add(notification.id));
    try {
      await markNotificationRead(notification.id);
    } catch (cause: unknown) {
      setReadIds((current) => {
        const next = new Set(current);
        next.delete(notification.id);
        return next;
      });
      setActionError(toApiError(cause).message);
    }
  };

  if (isLoading && !data) return <LoadingRow label="Chargement des notifications…" />;
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return null;

  const unread = Math.max(data.unread - readIds.size, 0);

  return (
    <div className="page-narrow stack stack--loose">
      <header className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1>Notifications</h1>
          <p className="page-header__subtitle" aria-live="polite">
            {unread === 0
              ? 'Tout est lu.'
              : `${pluralize(unread, 'notification non lue', 'notifications non lues')}.`}
          </p>
        </div>
      </header>

      {actionError && (
        <Notice tone="error">
          <p>{actionError}</p>
        </Notice>
      )}

      {data.data.length === 0 ? (
        <EmptyState
          title="Aucune notification"
          description="Les prises de contact des recruteurs et les résultats de certification apparaîtront ici."
        />
      ) : (
        <ul className="card panel notification-list">
          {data.data.map((notification) => {
            const isRead = notification.isRead || readIds.has(notification.id);
            return (
              <li
                key={notification.id}
                className={`notification${isRead ? '' : ' notification--unread'}`}
              >
                <div className="stack" style={{ gap: 'var(--space-1)' }}>
                  <p className="notification__title">
                    {notification.title}
                    {!isRead && <span className="visually-hidden"> (non lue)</span>}
                  </p>
                  <p className="notification__message">{notification.message}</p>
                  <p className="notification__date">{formatDateTime(notification.createdAt)}</p>
                </div>
                {!isRead && (
                  <button
                    type="button"
                    className="button button--subtle"
                    onClick={() => void markRead(notification)}
                  >
                    Marquer comme lue
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Pagination
        pagination={data.pagination}
        onPageChange={(next) => setSearchParams(next > 1 ? { page: String(next) } : {})}
      />
    </div>
  );
};
