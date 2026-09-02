import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent, JSX } from 'react';
import { Link } from 'react-router-dom';
import type { Profile } from '@profils-actifs/shared';
import { getToken } from '../../utils/authStorage.js';
import { getMyProfile, upsertMyProfile } from '../../services/profiles.js';
import { addVideo, deleteVideo } from '../../services/videos.js';
import { myProfileFormSchema, type MyProfileFormValues } from '../../validators/profile.js';
import { addVideoFormSchema, type AddVideoFormValues } from '../../validators/video.js';
import { VideoEmbed } from '../../components/VideoEmbed.js';
import styles from './MyProfilePage.module.css';

const EMPTY_FORM: MyProfileFormValues = { headline: '', bio: '', location: '', sector: '' };
const EMPTY_VIDEO_FORM: AddVideoFormValues = { title: '', url: '' };

function toFormValues(profile: Profile | null): MyProfileFormValues {
  if (!profile) {
    return EMPTY_FORM;
  }
  return {
    headline: profile.headline ?? '',
    bio: profile.bio ?? '',
    location: profile.location,
    sector: profile.sector,
  };
}

/**
 * `POST /profiles/me`, applicant only. Requires a stored token (see
 * `utils/authStorage.ts`) — `api.ts`'s interceptor attaches it to every
 * request automatically, so nothing in this page constructs an
 * `Authorization` header itself. With no token, this page shows a login
 * prompt instead of the form; there's no dedicated login page to redirect
 * to yet (Domain A hasn't shipped one), so a hard `navigate()` would just
 * bounce the user at a route that doesn't exist. Once that route exists,
 * the `<Link to="/login">` below already points at it.
 */
export function MyProfilePage(): JSX.Element {
  const isAuthenticated = getToken() !== null;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isAuthenticated);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<MyProfileFormValues>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof MyProfileFormValues, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [videoForm, setVideoForm] = useState<AddVideoFormValues>(EMPTY_VIDEO_FORM);
  const [videoFieldErrors, setVideoFieldErrors] = useState<Partial<Record<keyof AddVideoFormValues, string>>>(
    {},
  );
  const [addingVideo, setAddingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let isCurrent = true;

    async function run(): Promise<void> {
      setLoading(true);
      setLoadError(null);
      try {
        // 404 here means "no profile yet" (a brand-new applicant), which
        // `getMyProfile` already surfaces as `null`, not an error — the
        // form below just starts blank in that case.
        const result = await getMyProfile();
        if (!isCurrent) return;
        setProfile(result);
        setForm(toFormValues(result));
      } catch {
        if (!isCurrent) return;
        setLoadError('Impossible de charger votre profil pour le moment.');
      } finally {
        if (isCurrent) setLoading(false);
      }
    }

    void run();

    return () => {
      isCurrent = false;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className={styles.emptyState}>
        <p>Vous devez être connecté(e) pour modifier votre profil.</p>
        <Link to="/login">Se connecter</Link>
      </div>
    );
  }

  function handleFieldChange(field: keyof MyProfileFormValues) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      const { value } = event.target;
      setForm((prev) => ({ ...prev, [field]: value }));
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
      setSaveSuccess(false);
      setSaveError(null);
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const parsed = myProfileFormSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof MyProfileFormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof MyProfileFormValues | undefined;
        if (key && !nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const saved = await upsertMyProfile(parsed.data);
      setProfile(saved);
      setForm(toFormValues(saved));
      setSaveSuccess(true);
    } catch {
      setSaveError('Impossible d’enregistrer votre profil pour le moment.');
    } finally {
      setSaving(false);
    }
  }

  function handleVideoFieldChange(field: keyof AddVideoFormValues) {
    return (event: ChangeEvent<HTMLInputElement>): void => {
      const { value } = event.target;
      setVideoForm((prev) => ({ ...prev, [field]: value }));
      setVideoFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    };
  }

  async function handleAddVideo(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!profile) {
      return;
    }

    const parsed = addVideoFormSchema.safeParse(videoForm);
    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof AddVideoFormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof AddVideoFormValues | undefined;
        if (key && !nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setVideoFieldErrors(nextErrors);
      return;
    }

    setVideoFieldErrors({});
    setAddingVideo(true);
    setVideoError(null);

    try {
      const created = await addVideo(profile.id, { ...parsed.data, type: 'EXTERNAL_LINK' });
      setProfile((prev) => (prev ? { ...prev, videos: [...prev.videos, created] } : prev));
      setVideoForm(EMPTY_VIDEO_FORM);
    } catch {
      setVideoError('Impossible d’ajouter cette vidéo pour le moment.');
    } finally {
      setAddingVideo(false);
    }
  }

  async function handleDeleteVideo(videoId: string): Promise<void> {
    setVideoError(null);
    try {
      await deleteVideo(videoId);
      setProfile((prev) => (prev ? { ...prev, videos: prev.videos.filter((v) => v.id !== videoId) } : prev));
    } catch {
      setVideoError('Impossible de supprimer cette vidéo pour le moment.');
    }
  }

  if (loading) {
    return <p role="status">Chargement de votre profil…</p>;
  }

  return (
    <div className={styles.page}>
      <h1>Mon profil</h1>

      {loadError && <p role="alert">{loadError}</p>}

      <form className={styles.form} onSubmit={(event) => void handleSubmit(event)} noValidate>
        <div className={styles.field}>
          <label htmlFor="headline">Titre</label>
          <input
            id="headline"
            type="text"
            value={form.headline}
            onChange={handleFieldChange('headline')}
            aria-invalid={Boolean(fieldErrors.headline)}
            aria-describedby={fieldErrors.headline ? 'headline-error' : undefined}
          />
          {fieldErrors.headline && (
            <p id="headline-error" className={styles.fieldError}>
              {fieldErrors.headline}
            </p>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            value={form.bio}
            onChange={handleFieldChange('bio')}
            rows={5}
            aria-invalid={Boolean(fieldErrors.bio)}
            aria-describedby={fieldErrors.bio ? 'bio-error' : undefined}
          />
          {fieldErrors.bio && (
            <p id="bio-error" className={styles.fieldError}>
              {fieldErrors.bio}
            </p>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="location">Localisation</label>
          <input
            id="location"
            type="text"
            value={form.location}
            onChange={handleFieldChange('location')}
            aria-invalid={Boolean(fieldErrors.location)}
            aria-describedby={fieldErrors.location ? 'location-error' : undefined}
          />
          {fieldErrors.location && (
            <p id="location-error" className={styles.fieldError}>
              {fieldErrors.location}
            </p>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="sector">Secteur</label>
          <input
            id="sector"
            type="text"
            value={form.sector}
            onChange={handleFieldChange('sector')}
            aria-invalid={Boolean(fieldErrors.sector)}
            aria-describedby={fieldErrors.sector ? 'sector-error' : undefined}
          />
          {fieldErrors.sector && (
            <p id="sector-error" className={styles.fieldError}>
              {fieldErrors.sector}
            </p>
          )}
        </div>

        {saveError && (
          <p role="alert" className={styles.fieldError}>
            {saveError}
          </p>
        )}
        {saveSuccess && <p role="status">Profil enregistré.</p>}

        <button type="submit" disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>

      <section aria-labelledby="my-profile-skills-heading" className={styles.section}>
        <h2 id="my-profile-skills-heading">Compétences</h2>
        {profile && profile.skills.length > 0 ? (
          <ul className={styles.skills}>
            {profile.skills.map((skill) => (
              <li key={skill.id} className={styles.skill}>
                {skill.skillName}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.hint}>Aucune compétence renseignée pour le moment.</p>
        )}
        <p className={styles.hint}>
          La gestion des compétences n’est pas encore disponible ici — elle arrive dans une prochaine mise à
          jour.
        </p>
      </section>

      <section aria-labelledby="my-profile-videos-heading" className={styles.section}>
        <h2 id="my-profile-videos-heading">Vidéos</h2>

        {!profile ? (
          <p className={styles.hint}>Enregistrez d’abord votre profil ci-dessus pour pouvoir ajouter des vidéos.</p>
        ) : (
          <>
            {profile.videos.length === 0 ? (
              <p className={styles.hint}>Aucune vidéo pour le moment.</p>
            ) : (
              <ul className={styles.videos}>
                {profile.videos.map((video) => (
                  <li key={video.id} className={styles.video}>
                    <VideoEmbed type={video.type} url={video.url} />
                    <button type="button" onClick={() => void handleDeleteVideo(video.id)}>
                      Supprimer
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <form className={styles.form} onSubmit={(event) => void handleAddVideo(event)} noValidate>
              <div className={styles.field}>
                <label htmlFor="video-title">Titre de la vidéo</label>
                <input
                  id="video-title"
                  type="text"
                  value={videoForm.title}
                  onChange={handleVideoFieldChange('title')}
                  aria-invalid={Boolean(videoFieldErrors.title)}
                  aria-describedby={videoFieldErrors.title ? 'video-title-error' : undefined}
                />
                {videoFieldErrors.title && (
                  <p id="video-title-error" className={styles.fieldError}>
                    {videoFieldErrors.title}
                  </p>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="video-url">Lien YouTube ou Vimeo</label>
                <input
                  id="video-url"
                  type="url"
                  value={videoForm.url}
                  onChange={handleVideoFieldChange('url')}
                  aria-invalid={Boolean(videoFieldErrors.url)}
                  aria-describedby={videoFieldErrors.url ? 'video-url-error' : undefined}
                />
                {videoFieldErrors.url && (
                  <p id="video-url-error" className={styles.fieldError}>
                    {videoFieldErrors.url}
                  </p>
                )}
              </div>

              {videoError && (
                <p role="alert" className={styles.fieldError}>
                  {videoError}
                </p>
              )}

              <button type="submit" disabled={addingVideo}>
                {addingVideo ? 'Ajout…' : 'Ajouter la vidéo'}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
