import type { PaginationMeta } from '@profils-actifs/shared';

interface PaginationProps {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
}

/**
 * Purely presentational: a `PaginationMeta` in, `onPageChange` out. Takes
 * the whole `pagination` object rather than separate `page`/`totalPages`
 * primitives, since every caller already holds exactly that object from
 * its last fetch — no destructuring needed at the call site.
 */
export const Pagination = ({ pagination, onPageChange }: PaginationProps) => {
  const { page, pages } = pagination;

  if (pages <= 1) return null;

  return (
    <nav className="pagination" aria-label="Pagination des résultats">
      <button
        type="button"
        className="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        Précédent
      </button>
      <span aria-live="polite">
        Page {page} sur {pages}
      </span>
      <button
        type="button"
        className="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pages}
      >
        Suivant
      </button>
    </nav>
  );
};
