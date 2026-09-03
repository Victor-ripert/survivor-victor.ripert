import { useState, type ChangeEvent, type FormEvent } from 'react';
import { CONSENT_TEXT_VERSION, VIDEO_CONSENT_TEXT, type Profile } from '@profils-actifs/shared';
import { FormField } from '../../components/FormField.js';
import { ModerationStatusBadge } from '../../components/ModerationStatusBadge.js';
import { Notice } from '../../components/StatusMessages.js';
import { VideoPlayer } from '../../components/VideoPlayer.js';
import { useFormErrors } from '../../hooks/useFormErrors.js';
import { toApiError } from '../../services/api.js';
import { addVideo, deleteVideo } from '../../services/videos.js';
import { EMPTY_VIDEO_FORM, videoFormSchema, type VideoFormValues } from './profile-form.js';

type Field = keyof VideoFormValues;

const OWN_VIDEO_LABELS = { APPROVED: 'Validée · visible', PENDING: 'En attente de validation' };

interface VideosSectionProps {
  profile: Profile | null;
  onChanged: (profile: Profile) => void;
}

export const VideosSection = ({ profile, onChanged }: VideosSectionProps) => {
  const [form, setForm] = useState<VideoFormValues>(EMPTY_VIDEO_FORM);
  const { errors, fromZod, clear } = useFormErrors<Field>();
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const update =
    (field: Field) =>
    (event: ChangeEvent<HTMLInputElement>): void => {
      const value = field === 'consentAccepted' ? event.target.checked : event.target.value;
      setForm((current) => ({ ...current, [field]: value }));
      clear(field);
      setError(null);
    };

  const add = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!profile) return;

    const parsed = videoFormSchema.safeParse(form);
    if (!parsed.success) {
      fromZod(parsed.error);
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      const created = await addVideo(profile.id, { ...parsed.data, type: 'EXTERNAL_LINK' });
      onChanged({ ...profile, videos: [...profile.videos, created] });
      setForm(EMPTY_VIDEO_FORM);
    } catch (cause: unknown) {
      setError(toApiError(cause).message);
    } finally {
      setIsBusy(false);
    }
  };

  const remove = async (videoId: string): Promise<void> => {
    if (!profile) return;

    setIsBusy(true);
    setError(null);

    try {
      await deleteVideo(videoId);
      onChanged({ ...profile, videos: profile.videos.filter((video) => video.id !== videoId) });
      setConfirmingId(null);
    } catch (cause: unknown) {
      setError(toApiError(cause).message);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className="card panel" aria-labelledby="videos-title">
      <div>
        <h2 id="videos-title" className="panel__title">
          Vidéos de présentation
        </h2>
        <p className="panel__subtitle">
          Chaque vidéo est validée par un administrateur avant d’être visible. Supprimer une vidéo
          retire votre consentement à sa diffusion.
        </p>
      </div>

      {!profile ? (
        <p className="panel__subtitle">Enregistrez d’abord votre profil pour ajouter une vidéo.</p>
      ) : (
        <>
          {error && (
            <Notice tone="error">
              <p>{error}</p>
            </Notice>
          )}

          {profile.videos.length === 0 ? (
            <p className="panel__subtitle">Aucune vidéo pour le moment.</p>
          ) : (
            <ul className="video-list">
              {profile.videos.map((video) => (
                <li className="video-row" key={video.id}>
                  <VideoPlayer
                    video={video}
                    active={activeVideoId === video.id}
                    onActivate={setActiveVideoId}
                  />
                  <div className="video-row__body">
                    <p className="video-row__title">{video.title}</p>
                    <span>
                      <ModerationStatusBadge
                        status={video.moderationStatus}
                        labels={OWN_VIDEO_LABELS}
                      />
                    </span>
                    {video.moderationReason && (
                      <p className="video-row__reason">
                        <strong>Motif :</strong> {video.moderationReason}
                      </p>
                    )}
                  </div>
                  {confirmingId === video.id ? (
                    <div className="actions">
                      <button
                        type="button"
                        className="button button--danger"
                        disabled={isBusy}
                        onClick={() => void remove(video.id)}
                      >
                        Confirmer la suppression
                      </button>
                      <button
                        type="button"
                        className="button button--subtle"
                        onClick={() => setConfirmingId(null)}
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="button button--danger"
                      disabled={isBusy}
                      onClick={() => setConfirmingId(video.id)}
                    >
                      Supprimer
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <form
            className="stack"
            onSubmit={(event) => void add(event)}
            noValidate
            aria-labelledby="add-video-title"
          >
            <h3 id="add-video-title">Ajouter une vidéo</h3>
            <div className="form-grid">
              <FormField id="video-title" label="Titre" error={errors.title}>
                <input
                  type="text"
                  placeholder="Ma présentation"
                  value={form.title}
                  onChange={update('title')}
                  required
                />
              </FormField>
              <FormField id="video-url" label="Lien YouTube ou Vimeo" error={errors.url}>
                <input
                  type="url"
                  placeholder="https://youtu.be/…"
                  value={form.url}
                  onChange={update('url')}
                  required
                />
              </FormField>
            </div>

            <label className="checkbox checkbox--boxed">
              <input
                type="checkbox"
                checked={form.consentAccepted}
                onChange={update('consentAccepted')}
                aria-describedby={errors.consentAccepted ? 'consent-error' : undefined}
                aria-invalid={errors.consentAccepted ? true : undefined}
              />
              <span>
                {VIDEO_CONSENT_TEXT}{' '}
                <span className="field__optional">
                  (texte de consentement {CONSENT_TEXT_VERSION})
                </span>
              </span>
            </label>
            {errors.consentAccepted && (
              <p className="field__error" id="consent-error" role="alert">
                {errors.consentAccepted}
              </p>
            )}

            <div className="actions actions--end">
              <button type="submit" className="button" disabled={isBusy}>
                {isBusy ? 'Ajout…' : 'Ajouter la vidéo'}
              </button>
            </div>
          </form>
        </>
      )}
    </section>
  );
};
