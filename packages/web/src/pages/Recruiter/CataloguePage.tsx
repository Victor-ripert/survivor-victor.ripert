import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CATALOGUE_SORTS, type CatalogueQuery, type CatalogueSort } from '@profils-actifs/shared';
import { ProfileResults } from '../../components/ProfileResults.js';
import { useAsyncResource } from '../../hooks/useAsyncResource.js';
import { fetchCatalogue, fetchFacets } from '../../services/recruiter.js';
import { parseCatalogueParams, toCatalogueParams } from './catalogue-params.js';
import { CatalogueFilters } from './CatalogueFilters.js';

const SORT_LABELS: Record<CatalogueSort, string> = {
  recent: 'Profils récents',
  score: 'Score de certification',
  name: 'Nom',
};

export const CataloguePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersKey, setFiltersKey] = useState(0);

  const query = useMemo(() => parseCatalogueParams(searchParams), [searchParams]);

  const loadFacets = useCallback((signal: AbortSignal) => fetchFacets(signal), []);
  const { data: facets } = useAsyncResource(loadFacets);

  // Any filter change sends the reader back to the first page: page 4 of the
  // previous result set means nothing once the filters moved.
  const applyPatch = useCallback(
    (patch: Partial<CatalogueQuery>) => {
      setSearchParams(toCatalogueParams({ ...query, ...patch, page: 1 }), { replace: true });
    },
    [query, setSearchParams],
  );

  const changePage = useCallback(
    (page: number) => {
      setSearchParams(toCatalogueParams({ ...query, page }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [query, setSearchParams],
  );

  const reset = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
    setFiltersKey((key) => key + 1);
  }, [setSearchParams]);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Catalogue des profils</h1>
          <p className="page-header__subtitle">
            Recherchez des candidats, consultez leur vidéo de présentation et contactez-les
            directement.
          </p>
        </div>
      </header>

      <div className="catalogue-layout">
        <CatalogueFilters
          key={filtersKey}
          query={query}
          facets={facets}
          onChange={applyPatch}
          onReset={reset}
        />

        <section aria-label="Résultats">
          <ProfileResults
            query={query}
            fetchPage={fetchCatalogue}
            onPageChange={changePage}
            emptyTitle="Aucun profil ne correspond"
            emptyDescription="Élargissez la recherche en retirant un filtre."
            renderToolbar={(result) => (
              <div className="results-bar">
                <span aria-live="polite">
                  {result.pagination.total} profil{result.pagination.total > 1 ? 's' : ''} trouvé
                  {result.pagination.total > 1 ? 's' : ''}
                </span>
                <span className="results-bar__sort">
                  <label className="field__label" htmlFor="sort">
                    Trier par
                  </label>
                  <select
                    id="sort"
                    value={query.sort ?? 'recent'}
                    onChange={(event) => applyPatch({ sort: event.target.value as CatalogueSort })}
                  >
                    {CATALOGUE_SORTS.map((sort) => (
                      <option key={sort} value={sort}>
                        {SORT_LABELS[sort]}
                      </option>
                    ))}
                  </select>
                </span>
              </div>
            )}
          />
        </section>
      </div>
    </>
  );
};
