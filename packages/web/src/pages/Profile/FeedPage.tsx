import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../../components/Icon.js';
import { Pagination } from '../../components/Pagination.js';
import { PublicProfileCard } from '../../components/PublicProfileCard.js';
import { EmptyState, ErrorNotice, LoadingRow } from '../../components/StatusMessages.js';
import { useAsyncResource } from '../../hooks/useAsyncResource.js';
import { useAuth } from '../../hooks/useAuth.js';
import { fetchProfileFeed } from '../../services/profiles.js';
import { pluralize } from '../../utils/format.js';
import { HOME_BY_ROLE } from '../../utils/navigation.js';

const readPage = (raw: string | null): number => {
  const page = Number(raw);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

const Hero = () => {
  const { user } = useAuth();

  return (
    <section className="card hero">
      <div className="stack">
        <p className="hero__eyebrow">Ministère du Job et Bonheur · démonstrateur</p>
        <h1 className="hero__title">
          Des candidats qui se présentent en vidéo, une certification JEB pour attester leurs
          aptitudes.
        </h1>
        <p className="hero__lead">
          Un profil, une courte vidéo de présentation, un questionnaire de certification. Les
          recruteurs vous trouvent sur vos compétences, pas sur votre nom.
        </p>
        <div className="actions">
          {user ? (
            <Link className="button button--primary button--lg" to={HOME_BY_ROLE[user.role]}>
              Accéder à mon espace
            </Link>
          ) : (
            <>
              <Link className="button button--primary button--lg" to="/inscription">
                Créer mon profil
              </Link>
              <Link className="button button--lg" to="/connexion">
                Espace recruteur
              </Link>
            </>
          )}
        </div>
      </div>
      <div className="hero__steps">
        <div className="hero__step">
          <Icon name="person" size={22} />
          <p>
            <strong>1. Un profil</strong>
          </p>
          <p>Secteur, localisation, compétences.</p>
        </div>
        <div className="hero__step">
          <Icon name="video" size={22} />
          <p>
            <strong>2. Une vidéo</strong>
          </p>
          <p>Validée avant toute publication.</p>
        </div>
        <div className="hero__step">
          <Icon name="badge" size={22} />
          <p>
            <strong>3. Un badge</strong>
          </p>
          <p>La certification JEB, calculée côté serveur.</p>
        </div>
      </div>
    </section>
  );
};

/**
 * The public feed: server-paginated at 20 profiles a page (brief §8.6), no
 * filter (the feed exposes no selection criterion), and one video playing at
 * a time.
 */
export const FeedPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = readPage(searchParams.get('page'));
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const load = useCallback((signal: AbortSignal) => fetchProfileFeed(page, signal), [page]);
  const { data, error, isLoading, reload } = useAsyncResource(load);

  const changePage = (nextPage: number): void => {
    setSearchParams(nextPage > 1 ? { page: String(nextPage) } : {});
    setActiveVideoId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <Hero />

      <section aria-labelledby="feed-title" className="stack">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h2 id="feed-title">Profils publiés</h2>
          {data && (
            <p className="page-header__subtitle" aria-live="polite">
              {pluralize(data.pagination.total, 'profil')} · page {data.pagination.page} sur{' '}
              {Math.max(data.pagination.pages, 1)}
            </p>
          )}
        </div>

        {isLoading && !data && <LoadingRow label="Chargement des profils…" />}
        {error && <ErrorNotice error={error} onRetry={reload} />}

        {data && data.data.length === 0 && (
          <EmptyState
            title="Aucun profil publié"
            description="Les profils apparaissent ici une fois validés par un administrateur."
          />
        )}

        {data && data.data.length > 0 && (
          <div className="feed-grid">
            {data.data.map((profile) => (
              <PublicProfileCard
                key={profile.id}
                profile={profile}
                activeVideoId={activeVideoId}
                onActivateVideo={setActiveVideoId}
              />
            ))}
          </div>
        )}

        {data && <Pagination pagination={data.pagination} onPageChange={changePage} />}
      </section>
    </>
  );
};
