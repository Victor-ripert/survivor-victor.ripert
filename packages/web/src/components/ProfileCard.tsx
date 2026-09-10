import { Link } from 'react-router-dom';
import { AVAILABILITY_LABELS, type CatalogueProfile } from '@profils-actifs/shared';
import { CertificationBadge } from './CertificationBadge.js';
import { Icon } from './Icon.js';
import { VideoPlayer } from './VideoPlayer.js';
import { formatDate, pluralize } from '../utils/format.js';

const VISIBLE_SKILLS = 6;

interface ProfileCardProps {
  profile: CatalogueProfile;
  isPending: boolean;
  activeVideoId: string | null;
  onActivateVideo: (videoId: string) => void;
  onToggleFavorite: (profile: CatalogueProfile) => void;
  onContact: (profile: CatalogueProfile) => void;
  onView: (profile: CatalogueProfile) => void;
}

export const ProfileCard = ({
  profile,
  isPending,
  activeVideoId,
  onActivateVideo,
  onToggleFavorite,
  onContact,
  onView,
}: ProfileCardProps) => {
  const fullName = `${profile.firstName} ${profile.lastName}`;
  const hiddenSkills = profile.skills.length - VISIBLE_SKILLS;
  const preview = profile.previewVideo;
  const isPlaying = preview !== null && activeVideoId === preview.id;

  const openVideo = (videoId: string): void => {
    onActivateVideo(videoId);
    onView(profile);
  };

  return (
    <article className="card profile-card" aria-label={`Profil de ${fullName}`}>
      <div className="profile-card__head">
        <div>
          <h2 className="profile-card__name">{fullName}</h2>
          {profile.headline && <p className="profile-card__headline">{profile.headline}</p>}
        </div>
        <button
          type="button"
          className="button button--icon"
          aria-pressed={profile.isFavorite}
          disabled={isPending}
          onClick={() => onToggleFavorite(profile)}
        >
          <Icon name={profile.isFavorite ? 'star-filled' : 'star'} size={14} />
          <span className="visually-hidden">
            {profile.isFavorite
              ? `Retirer ${fullName} des favoris`
              : `Ajouter ${fullName} aux favoris`}
          </span>
          <span aria-hidden="true">Favori</span>
        </button>
      </div>

      <p className="meta">
        <span>{profile.sector}</span>
        <span aria-hidden="true">·</span>
        <span>{profile.location}</span>
        {profile.availability && (
          <>
            <span aria-hidden="true">·</span>
            <span>Disponible : {AVAILABILITY_LABELS[profile.availability]}</span>
          </>
        )}
        {profile.videoCount > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span>{pluralize(profile.videoCount, 'vidéo')}</span>
          </>
        )}
      </p>

      <CertificationBadge
        status={profile.certificationStatus}
        badge={profile.certificationBadge}
        score={profile.certificationScore}
      />

      {profile.skills.length > 0 && (
        <ul className="chip-list" aria-label="Compétences">
          {profile.skills.slice(0, VISIBLE_SKILLS).map((skill) => (
            <li className="chip" key={skill.id}>
              {skill.name}
            </li>
          ))}
          {hiddenSkills > 0 && <li className="chip">+{hiddenSkills}</li>}
        </ul>
      )}

      {preview && isPlaying && <VideoPlayer video={preview} active onActivate={onActivateVideo} />}

      {profile.lastContactedAt && (
        <p className="profile-card__contacted">
          Déjà contacté le {formatDate(profile.lastContactedAt)}
        </p>
      )}

      <div className="profile-card__actions">
        {preview && !isPlaying && (
          <button type="button" className="button" onClick={() => openVideo(preview.id)}>
            <Icon name="play" size={14} />
            Voir la vidéo
          </button>
        )}
        <Link className="button" to={`/profils/${profile.id}`}>
          Profil complet
        </Link>
        <button type="button" className="button button--primary" onClick={() => onContact(profile)}>
          Contacter
        </button>
      </div>
    </article>
  );
};
