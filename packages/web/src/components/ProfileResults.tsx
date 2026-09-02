import { useCallback, useState, type ReactNode } from 'react';
import type { CatalogueProfile, CatalogueQuery, PaginatedResponse } from '@profils-actifs/shared';
import { useAsyncResource } from '../hooks/useAsyncResource.js';
import { addFavorite, recordProfileView, removeFavorite } from '../services/recruiter.js';
import { toApiError } from '../services/api.js';
import { ContactDialog } from './ContactDialog.js';
import { Pagination } from './Pagination.js';
import { ProfileCard } from './ProfileCard.js';
import { EmptyState, ErrorNotice, LoadingRow, Notice } from './StatusMessages.js';

interface ProfileResultsProps {
  query: CatalogueQuery;
  fetchPage: (
    query: CatalogueQuery,
    signal: AbortSignal,
  ) => Promise<PaginatedResponse<CatalogueProfile>>;
  onPageChange: (page: number) => void;
  emptyTitle: string;
  emptyDescription: string;
  /** Favourites disappear from their own list once removed, so that view
   *  refetches instead of keeping a row that no longer belongs to it. */
  reloadOnUnfavorite?: boolean;
  renderToolbar?: (result: PaginatedResponse<CatalogueProfile>) => ReactNode;
}

export const ProfileResults = ({
  query,
  fetchPage,
  onPageChange,
  emptyTitle,
  emptyDescription,
  reloadOnUnfavorite = false,
  renderToolbar,
}: ProfileResultsProps) => {
  const load = useCallback((signal: AbortSignal) => fetchPage(query, signal), [fetchPage, query]);
  const { data, error, isLoading, reload } = useAsyncResource(load);

  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});
  const [pendingFavorite, setPendingFavorite] = useState<string | null>(null);
  const [contactTarget, setContactTarget] = useState<CatalogueProfile | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const toggleFavorite = async (profile: CatalogueProfile): Promise<void> => {
    const nextValue = !(favoriteOverrides[profile.userId] ?? profile.isFavorite);

    setPendingFavorite(profile.userId);
    setActionError(null);
    setFavoriteOverrides((current) => ({ ...current, [profile.userId]: nextValue }));

    try {
      await (nextValue ? addFavorite(profile.userId) : removeFavorite(profile.userId));
      if (!nextValue && reloadOnUnfavorite) reload();
    } catch (cause: unknown) {
      setFavoriteOverrides((current) => ({ ...current, [profile.userId]: !nextValue }));
      setActionError(toApiError(cause).message);
    } finally {
      setPendingFavorite(null);
    }
  };

  const registerView = (profile: CatalogueProfile): void => {
    // Best effort: failing to record a consultation must not break playback.
    recordProfileView(profile.userId).catch((cause: unknown) => {
      console.warn('[catalogue] consultation non enregistrée', toApiError(cause).message);
    });
  };

  if (isLoading && !data) return <LoadingRow label="Chargement des profils…" />;
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <>
      {renderToolbar?.(data)}

      {actionError && (
        <Notice tone="error">
          <p>{actionError}</p>
        </Notice>
      )}

      {feedback && (
        <Notice tone="success" className="stack">
          <p>{feedback}</p>
        </Notice>
      )}

      {data.data.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="profile-grid">
          {data.data.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={{
                ...profile,
                isFavorite: favoriteOverrides[profile.userId] ?? profile.isFavorite,
              }}
              isPending={pendingFavorite === profile.userId}
              activeVideoId={activeVideoId}
              onActivateVideo={setActiveVideoId}
              onToggleFavorite={toggleFavorite}
              onContact={setContactTarget}
              onView={registerView}
            />
          ))}
        </div>
      )}

      <Pagination pagination={data.pagination} onPageChange={onPageChange} />

      {contactTarget && (
        <ContactDialog
          recipient={contactTarget}
          onClose={() => setContactTarget(null)}
          onSent={(recipient) => {
            setContactTarget(null);
            setFeedback(`Message envoyé à ${recipient.firstName} ${recipient.lastName}.`);
            reload();
          }}
        />
      )}
    </>
  );
};
