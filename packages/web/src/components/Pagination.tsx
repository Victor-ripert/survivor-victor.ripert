import type { PaginationMeta } from '@profils-actifs/shared';

interface PaginationProps {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
}

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
