import type { JSX } from 'react';
import { useProfileFeed } from '../../hooks/useProfileFeed.js';
import { ProfileCard } from '../../components/ProfileCard.js';
import { Pagination } from '../../components/Pagination.js';
import styles from './FeedPage.module.css';

/**
 * The public profile feed (brief §2.3: recruiters browse a catalogue of
 * these; §4.4/§8.6: pagination must be server-side, 20/page). Composes the
 * three pieces built for this issue — none of them know about each other:
 * `useProfileFeed` owns fetching and page state, `ProfileCard` renders one
 * profile, `Pagination` renders the page controls — this page is only
 * where the three meet.
 *
 * The 20/page cap isn't enforced here: `useProfileFeed` always requests
 * `DEFAULT_PAGE_SIZE` from `@profils-actifs/shared`, the exact same
 * constant the API's own validators cap `limit` at — one number, defined
 * once, that both sides already agree on.
 */
export function FeedPage(): JSX.Element {
  const { profiles, pagination, page, setPage, loading, error } = useProfileFeed();

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
          <ProfileCard key={profile.id} profile={profile} />
        ))}
      </div>

      {pagination && <Pagination page={page} totalPages={pagination.pages} onPageChange={setPage} />}
    </section>
  );
}
