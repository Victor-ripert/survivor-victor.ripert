import { useEffect, useState } from 'react';
import {
  AVAILABILITY_LABELS,
  AVAILABILITY_STATUSES,
  type AvailabilityStatus,
  type CatalogueFacets,
  type CatalogueQuery,
  type FacetValue,
} from '@profils-actifs/shared';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { countActiveFilters } from './catalogue-params.js';

const SEARCH_DEBOUNCE_MS = 300;
const VISIBLE_SKILL_FACETS = 12;
const SCORE_THRESHOLDS = [50, 65, 80];

interface CatalogueFiltersProps {
  query: CatalogueQuery;
  facets: CatalogueFacets | null;
  onChange: (patch: Partial<CatalogueQuery>) => void;
  onReset: () => void;
}

const isAvailability = (value: string): value is AvailabilityStatus =>
  (AVAILABILITY_STATUSES as readonly string[]).includes(value);

const facetOptions = (values: FacetValue[]) =>
  values.map((entry) => (
    <option key={entry.value} value={entry.value}>
      {entry.value} ({entry.count})
    </option>
  ));

export const CatalogueFilters = ({ query, facets, onChange, onReset }: CatalogueFiltersProps) => {
  const [search, setSearch] = useState(query.q ?? '');
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);

  // The debounced value is the one that reaches the URL; typing itself stays
  // local so the field never loses a keystroke to a re-render.
  useEffect(() => {
    const next = debouncedSearch.trim();
    if (next !== (query.q ?? '')) onChange({ q: next || undefined });
  }, [debouncedSearch, onChange, query.q]);

  const activeFilters = countActiveFilters(query);
  const selectedSkills = query.skills ?? [];

  const toggleSkill = (skill: string): void => {
    const next = selectedSkills.includes(skill)
      ? selectedSkills.filter((entry) => entry !== skill)
      : [...selectedSkills, skill];

    onChange({ skills: next.length > 0 ? next : undefined });
  };

  return (
    <aside className="card filters" aria-label="Filtres du catalogue">
      <div className="filters__group">
        <label className="field__label" htmlFor="filter-search">
          Rechercher
        </label>
        <input
          id="filter-search"
          name="q"
          type="search"
          autoComplete="off"
          spellCheck={false}
          value={search}
          placeholder="Métier, compétence, ville…"
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="filters__group">
        <label className="field__label" htmlFor="filter-sector">
          Secteur
        </label>
        <select
          id="filter-sector"
          value={query.sector ?? ''}
          onChange={(event) => onChange({ sector: event.target.value || undefined })}
        >
          <option value="">Tous les secteurs</option>
          {facets && facetOptions(facets.sectors)}
        </select>
      </div>

      <div className="filters__group">
        <label className="field__label" htmlFor="filter-location">
          Ville
        </label>
        <select
          id="filter-location"
          value={query.location ?? ''}
          onChange={(event) => onChange({ location: event.target.value || undefined })}
        >
          <option value="">Toutes les villes</option>
          {facets && facetOptions(facets.locations)}
        </select>
      </div>

      <div className="filters__group">
        <label className="field__label" htmlFor="filter-availability">
          Disponibilité
        </label>
        <select
          id="filter-availability"
          value={query.availability ?? ''}
          onChange={(event) =>
            onChange({
              availability: isAvailability(event.target.value) ? event.target.value : undefined,
            })
          }
        >
          <option value="">Toutes les disponibilités</option>
          {facets?.availabilities.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {isAvailability(entry.value) ? AVAILABILITY_LABELS[entry.value] : entry.value} (
              {entry.count})
            </option>
          ))}
        </select>
      </div>

      {facets && facets.skills.length > 0 && (
        <fieldset className="filters__group" style={{ border: 0, margin: 0, padding: 0 }}>
          <legend className="field__label">Compétences</legend>
          <div className="filters__chips">
            {facets.skills.slice(0, VISIBLE_SKILL_FACETS).map((skill) => (
              <button
                key={skill.value}
                type="button"
                className="chip chip--toggle"
                aria-pressed={selectedSkills.includes(skill.value)}
                onClick={() => toggleSkill(skill.value)}
              >
                {skill.value}
              </button>
            ))}
          </div>
          <p className="field__hint">Un profil doit posséder toutes les compétences choisies.</p>
        </fieldset>
      )}

      <div className="filters__group">
        <label className="field__label" htmlFor="filter-score">
          Score de certification
        </label>
        <select
          id="filter-score"
          value={query.minScore === undefined ? '' : String(query.minScore)}
          onChange={(event) =>
            onChange({
              minScore: event.target.value === '' ? undefined : Number(event.target.value),
            })
          }
        >
          <option value="">Tous les scores</option>
          {SCORE_THRESHOLDS.map((threshold) => (
            <option key={threshold} value={threshold}>
              {threshold} et plus
            </option>
          ))}
        </select>
      </div>

      <label className="checkbox">
        <input
          type="checkbox"
          checked={query.certifiedOnly ?? false}
          onChange={(event) => onChange({ certifiedOnly: event.target.checked || undefined })}
        />
        Certification obtenue uniquement
      </label>

      <label className="checkbox">
        <input
          type="checkbox"
          checked={query.hasVideo ?? false}
          onChange={(event) => onChange({ hasVideo: event.target.checked || undefined })}
        />
        Avec vidéo de présentation
      </label>

      <button
        type="button"
        className="button button--subtle"
        onClick={onReset}
        disabled={activeFilters === 0}
      >
        Réinitialiser{activeFilters > 0 ? ` (${activeFilters})` : ''}
      </button>
    </aside>
  );
};
