import { useCallback, useState } from 'react';
import {
  VIDEO_MODERATION_REASON_MAX_LENGTH,
  VIDEO_MODERATION_REASON_MIN_LENGTH,
  type VideoModerationAction,
  type VideoModerationItem,
  type VideoModerationQueueFilter,
} from '@profils-actifs/shared';
import { Pagination } from '../../components/Pagination.js';
import { EmptyState, ErrorNotice, LoadingRow } from '../../components/StatusMessages.js';
import { useAsyncResource } from '../../hooks/useAsyncResource.js';
import { ApiError, toApiError } from '../../services/api.js';
import { fetchVideoModerationQueue, moderateVideo } from '../../services/recruiter.js';
import { formatDate } from '../../utils/format.js';
import { isEmbeddableUrl } from '../../utils/embed.js';

/**
 * A priori video moderation (brief §7.9.2). Nothing a candidate deposits is
 * visible to a recruiter or to the public until it has been approved here.
 *
 * Two constraints from the legal adviser shape this screen rather than its
 * styling: the reason is mandatory **in both directions**, because it is shown
 * back to the candidate — "a video that disappears without explanation is
 * litigation starting" — and every decision must say who took it and when,
 * which is why the last decision is rendered on each row.
 */

const FILTERS: { value: VideoModerationQueueFilter; label: string }[] = [
  { value: 'PENDING', label: 'À examiner' },
  { value: 'APPROVED', label: 'Validées' },
  { value: 'REJECTED', label: 'Refusées' },
  { value: 'ALL', label: 'Toutes' },
];

const STATUS_LABELS: Record<VideoModerationItem['moderationStatus'], string> = {
  PENDING: 'En attente',
  APPROVED: 'Validée',
  REJECTED: 'Refusée',
};

interface DecisionFormProps {
  video: VideoModerationItem;
  onDecided: () => void;
}

const DecisionForm = ({ video, onDecided }: DecisionFormProps) => {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState<VideoModerationAction | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

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
      setError(toApiError(cause));
    } finally {
      setPending(null);
    }
  };

  const reasonFieldId = `motif-${video.id}`;
  const notesFieldId = `notes-${video.id}`;
  const hintId = `motif-aide-${video.id}`;

  return (
    <form
      className="moderation__decision"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <div className="field">
        <label className="field__label" htmlFor={reasonFieldId}>
          Motif de la décision <span aria-hidden="true">*</span>
        </label>
        <textarea
          id={reasonFieldId}
          name="reason"
          rows={3}
          required
          value={reason}
          maxLength={VIDEO_MODERATION_REASON_MAX_LENGTH}
          aria-describedby={hintId}
          onChange={(event) => setReason(event.target.value)}
        />
        <p className="field__hint" id={hintId}>
          Obligatoire dans les deux cas, validation comprise. Ce texte est affiché au
          candidat&nbsp;: {VIDEO_MODERATION_REASON_MIN_LENGTH} caractères minimum.
        </p>
      </div>

      <div className="field">
        <label className="field__label" htmlFor={notesFieldId}>
          Note interne <span className="field__optional">(facultative)</span>
        </label>
        <textarea
          id={notesFieldId}
          name="notes"
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
        <p className="field__hint">Jamais montrée au candidat.</p>
      </div>

      {error && <ErrorNotice error={error} />}

      <div className="moderation__actions">
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

const VideoRow = ({ video, onDecided }: DecisionFormProps) => (
  <article className="card moderation__item">
    <header className="moderation__header">
      <div>
        <h2 className="moderation__title">{video.title}</h2>
        <p className="moderation__applicant">
          {video.applicant.firstName} {video.applicant.lastName}
          {video.applicant.headline && <span> — {video.applicant.headline}</span>}
        </p>
        <p className="moderation__meta">Déposée le {formatDate(video.submittedAt)}</p>
      </div>
      <span className={`badge badge--${video.moderationStatus.toLowerCase()}`}>
        {STATUS_LABELS[video.moderationStatus]}
      </span>
    </header>

    {video.description && <p className="moderation__description">{video.description}</p>}

    {isEmbeddableUrl(video.url) ? (
      <iframe
        className="moderation__player"
        src={video.url}
        title={`Vidéo de ${video.applicant.firstName} ${video.applicant.lastName} : ${video.title}`}
        allowFullScreen
      />
    ) : (
      // The allowlist in utils/embed.ts is what keeps an attacker-controlled
      // page out of an authenticated admin frame. A link that fails it is not
      // rendered, and it is not turned into a clickable link either.
      <p className="alert alert--error" role="alert">
        Cette adresse n’est pas une intégration reconnue et n’est donc pas affichée. À refuser, en
        indiquant au candidat une plateforme acceptée.
      </p>
    )}

    {video.lastDecision && (
      <p className="moderation__history">
        {video.lastDecision.action === 'APPROVE' ? 'Validée' : 'Refusée'} par{' '}
        {video.lastDecision.decidedBy.firstName} {video.lastDecision.decidedBy.lastName} le{' '}
        {formatDate(video.lastDecision.decidedAt)} — «&nbsp;{video.lastDecision.reason}&nbsp;»
      </p>
    )}

    <DecisionForm video={video} onDecided={onDecided} />
  </article>
);

export const VideoModerationPage = () => {
  const [status, setStatus] = useState<VideoModerationQueueFilter>('PENDING');
  const [page, setPage] = useState(1);

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
    <>
      <header className="page-header">
        <div>
          <h1>Modération des vidéos</h1>
          <p className="page-header__subtitle">
            Aucune vidéo n’est visible d’un recruteur ou du public avant d’avoir été validée ici.
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
          <div className="moderation__list">
            {data.data.map((video) => (
              <VideoRow key={video.id} video={video} onDecided={reload} />
            ))}
          </div>
          <Pagination pagination={data.pagination} onPageChange={setPage} />
        </>
      )}
    </>
  );
};
