import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  VIDEO_MODERATION_REASON_MAX_LENGTH,
  VIDEO_MODERATION_REASON_MIN_LENGTH,
  type VideoModerationAction,
  type VideoModerationItem,
  type VideoModerationQueueFilter,
} from '@profils-actifs/shared';
import { FormField } from '../../components/FormField.js';
import { ModerationStatusBadge } from '../../components/ModerationStatusBadge.js';
import { Pagination } from '../../components/Pagination.js';
import { EmptyState, ErrorNotice, LoadingRow, Notice } from '../../components/StatusMessages.js';
import { VideoPlayer } from '../../components/VideoPlayer.js';
import { useAsyncResource } from '../../hooks/useAsyncResource.js';
import { toApiError } from '../../services/api.js';
import { fetchVideoModerationQueue, moderateVideo } from '../../services/admin.js';
import { isEmbeddableUrl } from '../../utils/embed.js';
import { formatDateTime } from '../../utils/format.js';

/**
 * A priori video moderation (brief §7.9.2). Nothing a candidate deposits is
 * visible to a recruiter or to the public until it has been approved here.
 *
 * Two constraints from the legal adviser shape this screen: the reason is
 * mandatory **in both directions**, because it is shown back to the
 * candidate — "a video that disappears without explanation is litigation
 * starting" — and every decision must say who took it and when, which is why
 * the last decision is rendered on each row.
 */

const FILTERS: { value: VideoModerationQueueFilter; label: string }[] = [
  { value: 'PENDING', label: 'À examiner' },
  { value: 'APPROVED', label: 'Validées' },
  { value: 'REJECTED', label: 'Refusées' },
  { value: 'ALL', label: 'Toutes' },
];

interface DecisionFormProps {
  video: VideoModerationItem;
  onDecided: () => void;
}

const DecisionForm = ({ video, onDecided }: DecisionFormProps) => {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState<VideoModerationAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Derived, not stored: recomputing on each keystroke is cheaper than an
  // effect keeping a boolean in sync with the textarea.
  const trimmedReason = reason.trim();
  const reasonIsTooShort = trimmedReason.length < VIDEO_MODERATION_REASON_MIN_LENGTH;

  const decide = async (action: VideoModerationAction): Promise<void> => {
    setError(null);
    setPending(action);

    try {
      await moderateVideo(video.id, {
        action,
        reason: trimmedReason,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      onDecided();
    } catch (cause: unknown) {
      setError(toApiError(cause).message);
    } finally {
      setPending(null);
    }
  };

  return (
    <form
      className="moderation-item__decision"
      onSubmit={(event) => event.preventDefault()}
      aria-label={`Décision pour « ${video.title} »`}
    >
      <FormField
        id={`motif-${video.id}`}
        label={
          <>
            Motif de la décision <span aria-hidden="true">*</span>
          </>
        }
        hint={`Obligatoire dans les deux cas, validation comprise. Ce texte est affiché au candidat : ${VIDEO_MODERATION_REASON_MIN_LENGTH} caractères minimum.`}
      >
        <textarea
          name="reason"
          rows={3}
          required
          value={reason}
          maxLength={VIDEO_MODERATION_REASON_MAX_LENGTH}
          onChange={(event) => setReason(event.target.value)}
        />
      </FormField>

      <FormField
        id={`notes-${video.id}`}
        label="Note interne"
        hint="Jamais montrée au candidat."
        optional
      >
        <textarea
          name="notes"
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </FormField>

      {error && (
        <Notice tone="error">
          <p>{error}</p>
        </Notice>
      )}

      <div className="actions">
        <button
          type="button"
          className="button button--primary"
          disabled={reasonIsTooShort || pending !== null}
          onClick={() => void decide('APPROVE')}
        >
          {pending === 'APPROVE' ? 'Validation…' : 'Valider la vidéo'}
        </button>
        <button
          type="button"
          className="button button--danger"
          disabled={reasonIsTooShort || pending !== null}
          onClick={() => void decide('REJECT')}
        >
          {pending === 'REJECT' ? 'Refus…' : 'Refuser la vidéo'}
        </button>
      </div>
    </form>
  );
};

interface VideoRowProps extends DecisionFormProps {
  active: boolean;
  onActivate: (videoId: string) => void;
}

const VideoRow = ({ video, onDecided, active, onActivate }: VideoRowProps) => (
  <article className="card moderation-item" aria-label={`Vidéo « ${video.title} »`}>
    <div className="moderation-item__media">
      <div className="moderation-item__header">
        <div>
          <h2 className="moderation-item__title">{video.title}</h2>
          <p className="moderation-item__applicant">
            {video.applicant.firstName} {video.applicant.lastName}
            {video.applicant.headline && <span> — {video.applicant.headline}</span>}
          </p>
          <p className="moderation-item__meta">Déposée le {formatDateTime(video.submittedAt)}</p>
        </div>
        <ModerationStatusBadge status={video.moderationStatus} />
      </div>

      {video.description && <p className="moderation-item__meta">{video.description}</p>}

      {/* An upload is a file this API serves, played by <video>: the embed
          allowlist guards frames, and must not keep the administrator from
          watching a hosted video before ruling on it. */}
      {video.type === 'UPLOAD' || isEmbeddableUrl(video.url) ? (
        <VideoPlayer
          video={{
            id: video.id,
            title: video.title,
            type: video.type,
            url: video.url,
            captionsUrl: video.captionsUrl ?? undefined,
            duration: video.durationSeconds,
          }}
          active={active}
          onActivate={onActivate}
        />
      ) : (
        // The allowlist in utils/embed.ts is what keeps an attacker-controlled
        // page out of an authenticated admin frame. A link that fails it is
        // not rendered, and it is not turned into a clickable link either.
        <Notice tone="error">
          <p>
            Cette adresse n’est pas une intégration reconnue et n’est donc pas affichée. À refuser,
            en indiquant au candidat une plateforme acceptée.
          </p>
        </Notice>
      )}

      <Link to={`/profils/${video.applicant.profileId}`}>Ouvrir le profil du candidat</Link>

      {video.lastDecision && (
        <p className="moderation-item__history">
          {video.lastDecision.action === 'APPROVE' ? 'Validée' : 'Refusée'} par{' '}
          {video.lastDecision.decidedBy.firstName} {video.lastDecision.decidedBy.lastName} le{' '}
          {formatDateTime(video.lastDecision.decidedAt)} — «&nbsp;{video.lastDecision.reason}&nbsp;»
        </p>
      )}
    </div>

    <DecisionForm video={video} onDecided={onDecided} />
  </article>
);

export const VideoModerationPage = () => {
  const [status, setStatus] = useState<VideoModerationQueueFilter>('PENDING');
  const [page, setPage] = useState(1);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const load = useCallback(
    (signal: AbortSignal) => fetchVideoModerationQueue({ status, page }, signal),
    [status, page],
  );
  const { data, error, isLoading, reload } = useAsyncResource(load);

  const changeFilter = (next: VideoModerationQueueFilter): void => {
    setStatus(next);
    setPage(1);
  };

  return (
    <div className="page-reading stack stack--loose">
      <header className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1>Modération des vidéos</h1>
          <p className="page-header__subtitle">
            Aucune vidéo n’est visible d’un recruteur ou du public avant d’avoir été validée ici. Le
            motif est obligatoire et montré au candidat.
          </p>
        </div>
      </header>

      <div className="filters filters--inline" role="group" aria-label="Filtrer par statut">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`button ${status === filter.value ? 'button--primary' : ''}`}
            aria-pressed={status === filter.value}
            onClick={() => changeFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {isLoading && !data && <LoadingRow label="Chargement de la file…" />}
      {error && <ErrorNotice error={error} onRetry={reload} />}

      {data && data.data.length === 0 && (
        <EmptyState title="Rien à examiner" description="Aucune vidéo ne correspond à ce filtre." />
      )}

      {data && data.data.length > 0 && (
        <>
          <div className="moderation-list">
            {data.data.map((video) => (
              <VideoRow
                key={video.id}
                video={video}
                onDecided={reload}
                active={activeVideoId === video.id}
                onActivate={setActiveVideoId}
              />
            ))}
          </div>
          <Pagination pagination={data.pagination} onPageChange={setPage} />
        </>
      )}
    </div>
  );
};
