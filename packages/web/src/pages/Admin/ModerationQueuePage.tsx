import { useEffect, useState } from 'react';
import type { ChangeEvent, JSX } from 'react';
import { Link } from 'react-router-dom';
import type { ModerationAction, PaginationMeta, Profile } from '@profils-actifs/shared';
import { DEFAULT_PAGE_SIZE } from '@profils-actifs/shared';
import { getToken } from '../../utils/authStorage.js';
import { decodeToken } from '../../utils/jwt.js';
import { fetchPendingProfiles, moderateProfile } from '../../services/admin.js';
import { VideoEmbed } from '../../components/VideoEmbed.js';
import { Pagination } from '../../components/Pagination.js';
import styles from './ModerationQueuePage.module.css';

const ACTIONS: ReadonlyArray<{ action: ModerationAction; label: string }> = [
  { action: 'APPROVE', label: 'Approuver' },
  { action: 'REJECT', label: 'Rejeter' },
  { action: 'FLAG', label: 'Signaler' },
  { action: 'REQUIRE_CHANGES', label: 'Demander des modifications' },
];

/**
 * `GET /admin/moderation/profiles` + `POST /admin/profiles/:id/moderate`,
 * admin only. Gated on the frontend by decoding the stored JWT's `role`
 * claim (see `utils/jwt.ts`) — this is explicitly *not* a security
 * boundary: a tampered or forged token would still be rejected by the
 * API's own `requireRole('ADMIN')` middleware regardless of what this page
 * decides to render. It exists so a non-admin who somehow lands here sees
 * a clear "not for you" message instead of a page that fetches, fails with
 * a raw 403, and looks broken.
 */
export function ModerationQueuePage(): JSX.Element {
  const token = getToken();
  const currentUser = token ? decodeToken(token) : null;
  const isAdmin = currentUser?.role === 'ADMIN';

  const [page, setPage] = useState(1);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingActionProfileId, setPendingActionProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let isCurrent = true;

    async function run(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchPendingProfiles({ page, limit: DEFAULT_PAGE_SIZE });
        if (!isCurrent) return;
        setProfiles(result.data);
        setPagination(result.pagination);
      } catch {
        if (!isCurrent) return;
        setError('Impossible de charger la file de modération pour le moment.');
      } finally {
        if (isCurrent) setLoading(false);
      }
    }

    void run();

    return () => {
      isCurrent = false;
    };
  }, [isAdmin, page]);

  if (!token || !currentUser) {
    return (
      <div className={styles.emptyState}>
        <p>Vous devez être connecté(e) en tant qu’administrateur pour accéder à cette page.</p>
        <Link to="/login">Se connecter</Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className={styles.emptyState} role="alert">
        <p>Cette page est réservée aux administrateurs.</p>
      </div>
    );
  }

  /**
   * `pendingActionProfileId` lives here, on the page, not inside
   * `ModerationCard` — a successful action removes that profile from
   * `profiles` below, which unmounts its card. Tracking "which profile is
   * mid-action" in a component about to unmount would mean clearing that
   * flag in a `finally` block after the component is already gone (a
   * "state update on an unmounted component" warning); tracking it here,
   * in a component that never unmounts itself, avoids the problem
   * entirely instead of working around it.
   */
  async function handleModerate(
    profileId: string,
    action: ModerationAction,
    reason: string,
    notes: string,
  ): Promise<void> {
    setError(null);
    setPendingActionProfileId(profileId);
    try {
      await moderateProfile(profileId, {
        action,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setProfiles((prev) => prev.filter((profile) => profile.id !== profileId));
    } catch {
      setError('Impossible d’enregistrer cette décision pour le moment.');
    } finally {
      setPendingActionProfileId(null);
    }
  }

  return (
    <div className={styles.page}>
      <h1>File de modération</h1>

      {loading && <p role="status">Chargement…</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && !error && profiles.length === 0 && <p>Aucun profil en attente de modération.</p>}

      <ul className={styles.list}>
        {profiles.map((profile) => (
          <ModerationCard
            key={profile.id}
            profile={profile}
            onModerate={handleModerate}
            submitting={pendingActionProfileId === profile.id}
          />
        ))}
      </ul>

      {pagination && <Pagination page={page} totalPages={pagination.pages} onPageChange={setPage} />}
    </div>
  );
}

interface ModerationCardProps {
  profile: Profile;
  onModerate: (profileId: string, action: ModerationAction, reason: string, notes: string) => Promise<void>;
  submitting: boolean;
}

/**
 * One profile awaiting review. Reuses `VideoEmbed` exactly as built for
 * the public profile page and the feed — same component, same props, no
 * admin-specific video viewer — so a video plays back identically here as
 * everywhere else in the app, and any future fix or improvement to
 * `VideoEmbed` applies here automatically too.
 */
function ModerationCard({ profile, onModerate, submitting }: ModerationCardProps): JSX.Element {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  function handleReasonChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    setReason(event.target.value);
  }

  function handleNotesChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    setNotes(event.target.value);
  }

  return (
    <li className={styles.card}>
      <header className={styles.header}>
        <h2 className={styles.headline}>{profile.headline ?? profile.sector}</h2>
        <p className={styles.meta}>
          {profile.sector} · {profile.location}
        </p>
      </header>

      {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

      {profile.videos.length === 0 ? (
        <p className={styles.hint}>Aucune vidéo sur ce profil.</p>
      ) : (
        <div className={styles.videos}>
          {profile.videos.map((video) => (
            <VideoEmbed key={video.id} type={video.type} url={video.url} />
          ))}
        </div>
      )}

      <div className={styles.field}>
        <label htmlFor={`reason-${profile.id}`}>Motif (visible par le candidat)</label>
        <textarea id={`reason-${profile.id}`} value={reason} onChange={handleReasonChange} rows={2} />
      </div>
      <div className={styles.field}>
        <label htmlFor={`notes-${profile.id}`}>Notes internes</label>
        <textarea id={`notes-${profile.id}`} value={notes} onChange={handleNotesChange} rows={2} />
      </div>

      <div className={styles.actions}>
        {ACTIONS.map(({ action, label }) => (
          <button
            key={action}
            type="button"
            disabled={submitting}
            onClick={() => void onModerate(profile.id, action, reason, notes)}
          >
            {label}
          </button>
        ))}
      </div>
    </li>
  );
}
