import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pagination } from '../../components/Pagination.js';
import { EmptyState, ErrorNotice, LoadingRow } from '../../components/StatusMessages.js';
import { useAsyncResource } from '../../hooks/useAsyncResource.js';
import { fetchSentInteractions } from '../../services/recruiter.js';
import { formatDate, INTERACTION_LABELS, translate } from '../../utils/format.js';

export const ContactsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1') || 1;

  const load = useCallback((signal: AbortSignal) => fetchSentInteractions(page, signal), [page]);
  const { data, error, isLoading, reload } = useAsyncResource(load);

  const changePage = useCallback(
    (nextPage: number) => setSearchParams({ page: String(nextPage) }),
    [setSearchParams],
  );

  const header = useMemo(
    () => (
      <header className="page-header">
        <div>
          <h1>Historique des interactions</h1>
          <p className="page-header__subtitle">
            Toutes vos actions sur les profils : consultations, favoris et messages.
          </p>
        </div>
      </header>
    ),
    [],
  );

  if (isLoading && !data) {
    return (
      <>
        {header}
        <LoadingRow />
      </>
    );
  }

  if (error) {
    return (
      <>
        {header}
        <ErrorNotice error={error} onRetry={reload} />
      </>
    );
  }

  if (!data) return header;

  return (
    <>
      {header}

      {data.data.length === 0 ? (
        <EmptyState
          title="Aucune interaction"
          description="Vos consultations et messages apparaîtront ici."
        />
      ) : (
        <section className="card panel">
          <ul className="contact-list">
            {data.data.map((interaction) => (
              <li key={interaction.id}>
                <span className="contact-list__name">
                  {interaction.counterpart.firstName} {interaction.counterpart.lastName}
                </span>
                <span className="chip">{translate(INTERACTION_LABELS, interaction.type)}</span>
                <span className="contact-list__date">{formatDate(interaction.createdAt)}</span>
                {interaction.message && (
                  <span className="contact-list__message">{interaction.message}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Pagination pagination={data.pagination} onPageChange={changePage} />
    </>
  );
};
