import type { JSX } from 'react';
import { useProfileFeed } from '../../hooks/useProfileFeed.js';
import { PublicProfileCard } from '../../components/PublicProfileCard.js';
import { Pagination } from '../../components/Pagination.js';
import styles from './FeedPage.module.css';

/**
 * The public profile feed (brief §2.3: recruiters browse this; §4.4/§8.6:
 * server-side pagination, 20/page). Composes `useProfileFeed` (data),
 * `PublicProfileCard` (one profile), and `Pagination` (page controls) —
 * none of the three know about each other, this page is just where they
 * meet.
 *
 * The 20/page cap isn't enforced here: `useProfileFeed` always requests
 * `DEFAULT_PAGE_SIZE` from `@profils-actifs/shared`, the exact same
 * constant the API's own validators cap `limit` at — one number, defined
 * once, that both sides already agree on.
 */
export function FeedPage(): JSX.Element {
  const { profiles, pagination, setPage, loading, error } = useProfileFeed();

  return (
    <section className={styles.feed}>
      <h1 className={styles.title}>Profils</h1>

      {loading && <p role="status">Chargement des profils…</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && !error && profiles.length === 0 && (
        <p>Aucun profil ne correspond à ces critères pour le moment.</p>
      )}

      <div className={styles.grid}>
        {profiles.map((profile) => (
          <PublicProfileCard key={profile.id} profile={profile} />
        ))}
      </div>

      {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
    </section>
  );
}
