import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { ModerationAction, Profile } from '@profils-actifs/shared';
import { CertificationBadge } from '../../components/CertificationBadge.js';
import { FormField } from '../../components/FormField.js';
import { ModerationStatusBadge } from '../../components/ModerationStatusBadge.js';
import { Pagination } from '../../components/Pagination.js';
import { EmptyState, ErrorNotice, LoadingRow, Notice } from '../../components/StatusMessages.js';
import { VideoPlayer } from '../../components/VideoPlayer.js';
import { useAsyncResource } from '../../hooks/useAsyncResource.js';
import { toApiError } from '../../services/api.js';
import { fetchPendingProfiles, moderateProfile } from '../../services/admin.js';
import { formatDate, pluralize } from '../../utils/format.js';

const ACTIONS: ReadonlyArray<{ action: ModerationAction; label: string; className: string }> = [
  { action: 'APPROVE', label: 'Approuver', className: 'button button--primary' },
  { action: 'REQUIRE_CHANGES', label: 'Demander des modifications', className: 'button' },
  { action: 'FLAG', label: 'Signaler', className: 'button' },
  { action: 'REJECT', label: 'Rejeter', className: 'button button--danger' },
];

interface ProfileReviewProps {
  profile: Profile;
  onDecided: () => void;
}

const ProfileReview = ({ profile, onDecided }: ProfileReviewProps) => {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState<ModerationAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const decide = async (action: ModerationAction): Promise<void> => {
    setPending(action);
    setError(null);

    try {
      await moderateProfile(profile.id, {
        action,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onDecided();
    } catch (cause: unknown) {
      setError(toApiError(cause).message);
    } finally {
      setPending(null);
    }
  };

  const fullName = `${profile.firstName} ${profile.lastName}`;

  return (
    <article className="card moderation-item" aria-label={`Profil de ${fullName}`}>
      <div className="moderation-item__media">
        <div className="moderation-item__header">
          <div>
            <h2 className="moderation-item__title">{fullName}</h2>
            <p className="moderation-item__applicant">{profile.headline ?? 'Sans titre'}</p>
            <p className="moderation-item__meta">
              {profile.sector} · {profile.location} · déposé le {formatDate(profile.createdAt)}
            </p>
          </div>
          <ModerationStatusBadge status={profile.moderationStatus} />
        </div>

        <CertificationBadge
          status={profile.certificationStatus}
          badge={profile.certificationBadge ?? null}
          score={profile.certificationScore ?? null}
        />

        {profile.bio && <p className="profile-bio">{profile.bio}</p>}

        {profile.skills.length > 0 && (
          <ul className="chip-list" aria-label="Compétences">
            {profile.skills.map((skill) => (
              <li className="chip" key={skill.id}>
                {skill.skillName}
              </li>
            ))}
          </ul>
        )}

        {profile.videos.length === 0 ? (
          <p className="panel__subtitle">Aucune vidéo sur ce profil.</p>
        ) : (
          <div className="stack">
            {profile.videos.map((video) => (
              <div key={video.id} className="stack" style={{ gap: 'var(--space-2)' }}>
                <VideoPlayer
                  video={video}
                  active={activeVideoId === video.id}
                  onActivate={setActiveVideoId}
                />
                <p className="meta">
                  <span>{video.title}</span>
                  <ModerationStatusBadge status={video.moderationStatus} />
                </p>
              </div>
            ))}
            <p className="panel__subtitle">
              Les vidéos se valident séparément, dans{' '}
              <Link to="/admin/moderation-videos">la file des vidéos</Link>.
            </p>
          </div>
        )}
      </div>

      <form
        className="moderation-item__decision"
        onSubmit={(event) => event.preventDefault()}
        aria-label={`Décision pour ${fullName}`}
      >
        <FormField
          id={`reason-${profile.id}`}
          label="Motif"
          hint="Visible par le candidat."
          optional
        >
          <textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
        </FormField>
        <FormField
          id={`notes-${profile.id}`}
          label="Note interne"
          hint="Jamais montrée au candidat."
          optional
        >
          <textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </FormField>

        {error && (
          <Notice tone="error">
            <p>{error}</p>
          </Notice>
        )}

        <div className="actions">
          {ACTIONS.map((entry) => (
            <button
              key={entry.action}
              type="button"
              className={entry.className}
              disabled={pending !== null}
              onClick={() => void decide(entry.action)}
            >
              {pending === entry.action ? 'Enregistrement…' : entry.label}
            </button>
          ))}
        </div>
      </form>
    </article>
  );
};

/** `GET /admin/moderation/profiles` + `POST /admin/profiles/:id/moderate`:
 *  the review queue, oldest submission first. */
export const ProfileModerationPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1') || 1;

  const load = useCallback((signal: AbortSignal) => fetchPendingProfiles(page, signal), [page]);
  const { data, error, isLoading, reload } = useAsyncResource(load);

  return (
    <div className="page-reading stack stack--loose">
      <header className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1>Modération des profils</h1>
          <p className="page-header__subtitle">
            Un profil n’apparaît sur le fil public qu’une fois approuvé ici. Chaque décision est
            journalisée avec son auteur.
          </p>
        </div>
        {data && (
          <p className="page-header__subtitle" aria-live="polite">
            {pluralize(data.pagination.total, 'profil en attente', 'profils en attente')}
          </p>
        )}
      </header>

      {isLoading && !data && <LoadingRow label="Chargement de la file…" />}
      {error && <ErrorNotice error={error} onRetry={reload} />}

      {data && data.data.length === 0 && (
        <EmptyState title="Rien à examiner" description="Aucun profil n'attend de décision." />
      )}

      {data && data.data.length > 0 && (
        <>
          <div className="moderation-list">
            {data.data.map((profile) => (
              <ProfileReview key={profile.id} profile={profile} onDecided={reload} />
            ))}
          </div>
          <Pagination
            pagination={data.pagination}
            onPageChange={(next) => setSearchParams(next > 1 ? { page: String(next) } : {})}
          />
        </>
      )}
    </div>
  );
};
