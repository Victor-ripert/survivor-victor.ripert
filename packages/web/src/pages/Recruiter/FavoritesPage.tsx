import { useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ProfileResults } from '../../components/ProfileResults.js';
import { fetchFavorites } from '../../services/recruiter.js';
import { parseCatalogueParams, toCatalogueParams } from './catalogue-params.js';

export const FavoritesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => parseCatalogueParams(searchParams), [searchParams]);

  const changePage = useCallback(
    (page: number) => setSearchParams(toCatalogueParams({ ...query, page })),
    [query, setSearchParams],
  );

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Ma sélection</h1>
          <p className="page-header__subtitle">
            Les profils que vous avez mis de côté. Le candidat n’est pas notifié d’une
            mise en favori.
          </p>
        </div>
      </header>

      <ProfileResults
        query={query}
        fetchPage={fetchFavorites}
        onPageChange={changePage}
        reloadOnUnfavorite
        emptyTitle="Aucun profil en favori"
        emptyDescription="Ajoutez des candidats depuis le catalogue pour les retrouver ici."
      />

      <p style={{ marginTop: 'var(--space-5)' }}>
        <Link to="/recruteur/catalogue">Parcourir le catalogue</Link>
      </p>
    </>
  );
};
