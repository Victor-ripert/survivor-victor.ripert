import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CertificationBadge } from '../../components/CertificationBadge.js';
import { ContactDialog } from '../../components/ContactDialog.js';
import { Icon } from '../../components/Icon.js';
import { EmptyState, ErrorNotice, LoadingRow, Notice } from '../../components/StatusMessages.js';
import { VideoPlayer } from '../../components/VideoPlayer.js';
import { useAsyncResource } from '../../hooks/useAsyncResource.js';
import { useAuth } from '../../hooks/useAuth.js';
import { fetchProfile } from '../../services/profiles.js';
import { SKILL_LEVEL_LABELS } from '../../utils/format.js';

/**
 * The public profile page — one of the three audited screens (brief §7.4):
 * every video is a keyboard-reachable control, focus stays visible, and the
 * certification state is written out rather than coloured.
 */
export const ProfilePage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [isContacting, setIsContacting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback((signal: AbortSignal) => fetchProfile(id, signal), [id]);
  const { data: profile, error, isLoading, reload } = useAsyncResource(load);

  if (isLoading && !profile) return <LoadingRow label="Chargement du profil…" />;

  if (error?.status === 404) {
    return (
      <EmptyState
        title="Ce profil n'existe pas, ou n'est plus disponible."
        action={<Link to="/">Retour aux profils</Link>}
      />
    );
  }

  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!profile) return null;

  const fullName = `${profile.firstName} ${profile.lastName}`;
  const isOwner = user?.id === profile.userId;
  const canContact = user?.role === 'RECRUITER' || user?.role === 'ADMIN';

  return (
    <div className="page-reading stack stack--loose">
      <Link className="back-link" to="/">
        <Icon name="arrow-left" />
        Retour aux profils
      </Link>

      {isOwner && profile.moderationStatus !== 'APPROVED' && (
        <Notice tone="warning">
          <p>
            Ce profil n’est visible que par vous tant qu’un administrateur ne l’a pas validé.{' '}
            <Link to="/mon-profil">Modifier mon profil</Link>
          </p>
        </Notice>
      )}

      {feedback && (
        <Notice tone="success">
          <p>{feedback}</p>
        </Notice>
      )}

      <article className="two-col">
        <div className="stack stack--loose">
          <header className="profile-header">
            <div className="profile-header__row">
              <div>
                <h1>{fullName}</h1>
                {profile.headline && <p className="profile-header__headline">{profile.headline}</p>}
              </div>
              <CertificationBadge
                status={profile.certificationStatus}
                badge={profile.certificationBadge ?? null}
                score={profile.certificationScore ?? null}
              />
            </div>
            <p className="meta">
              <span>{profile.sector}</span>
              <span aria-hidden="true">·</span>
              <span>{profile.location}</span>
            </p>
          </header>

          <section className="card panel" aria-labelledby="profile-videos-heading">
            <h2 id="profile-videos-heading" className="panel__title">
              {profile.videos.length > 1 ? 'Vidéos de présentation' : 'Vidéo de présentation'}
            </h2>
            {profile.videos.length === 0 ? (
              <p className="panel__subtitle">Aucune vidéo pour le moment.</p>
            ) : (
              <div className="stack">
                {profile.videos.map((video) => (
                  <VideoPlayer
                    key={video.id}
                    video={video}
                    active={activeVideoId === video.id}
                    onActivate={setActiveVideoId}
                  />
                ))}
                <p className="panel__subtitle">
                  Le lecteur n’est chargé qu’au clic.{' '}
                  {profile.videos.some((video) => video.captionsUrl)
                    ? 'Les vidéos hébergées par ProfilsActifs affichent leurs sous-titres dès le lancement.'
                    : 'Pour une vidéo YouTube ou Vimeo, l’affichage des sous-titres est demandé au lecteur de la plateforme, qui l’honore lorsque la vidéo en propose une.'}
                </p>
              </div>
            )}
          </section>

          {profile.bio && (
            <section className="stack" aria-labelledby="profile-bio-heading">
              <h2 id="profile-bio-heading">Présentation</h2>
              <p className="profile-bio">{profile.bio}</p>
            </section>
          )}
        </div>

        <aside className="stack">
          <section className="card panel" aria-labelledby="profile-skills-heading">
            <h2 id="profile-skills-heading" className="panel__title">
              Compétences
            </h2>
            {profile.skills.length === 0 ? (
              <p className="panel__subtitle">Aucune compétence renseignée.</p>
            ) : (
              <ul className="skill-table">
                {profile.skills.map((skill) => (
                  <li key={skill.id}>
                    <span className="skill-table__name">{skill.skillName}</span>
                    <span className="skill-table__level">{SKILL_LEVEL_LABELS[skill.level]}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {canContact && (
            <section className="card panel" aria-labelledby="profile-contact-heading">
              <h2 id="profile-contact-heading" className="panel__title">
                Prendre contact
              </h2>
              <p className="panel__subtitle">
                Votre message est transmis dans l’espace du candidat, qui en est notifié. Aucune
                adresse e-mail n’est communiquée.
              </p>
              <button
                type="button"
                className="button button--primary button--lg"
                onClick={() => setIsContacting(true)}
              >
                Contacter
              </button>
            </section>
          )}

          {!user && (
            <section className="card panel">
              <p className="panel__subtitle">
                Vous recrutez ? <Link to="/connexion">Connectez-vous</Link> pour contacter{' '}
                {profile.firstName}.
              </p>
            </section>
          )}
        </aside>
      </article>

      {isContacting && (
        <ContactDialog
          recipient={{
            userId: profile.userId,
            firstName: profile.firstName,
            lastName: profile.lastName,
          }}
          onClose={() => setIsContacting(false)}
          onSent={() => {
            setIsContacting(false);
            setFeedback(`Message envoyé à ${fullName}.`);
          }}
        />
      )}
    </div>
  );
};
