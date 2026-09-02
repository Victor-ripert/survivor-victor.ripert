import type { JSX } from 'react';
import styles from './Pagination.module.css';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Purely presentational: `page`/`totalPages` in, `onPageChange` out. Has
 * no idea whether it's paging through the public feed, a future recruiter
 * catalogue, or an admin queue — whoever renders it owns the actual fetch,
 * this only ever asks for "go to page N."
 */
export function Pagination({ page, totalPages, onPageChange }: PaginationProps): JSX.Element | null {
  if (totalPages <= 1) {
    return null;
  }

  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <button
        type="button"
        className={styles.button}
        onClick={() => onPageChange(page - 1)}
        disabled={isFirstPage}
      >
        Précédent
      </button>
      <span className={styles.status} aria-live="polite">
        Page {page} sur {totalPages}
      </span>
      <button
        type="button"
        className={styles.button}
        onClick={() => onPageChange(page + 1)}
        disabled={isLastPage}
      >
        Suivant
      </button>
    </nav>
  );
}
