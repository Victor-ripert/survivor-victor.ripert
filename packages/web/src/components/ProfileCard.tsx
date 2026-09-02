import { useState } from 'react';
import type { CatalogueProfile } from '@profils-actifs/shared';
import { CertificationBadge } from './CertificationBadge.js';
import { formatDate } from '../utils/format.js';
import { isEmbeddableUrl } from '../utils/embed.js';

const VISIBLE_SKILLS = 6;

interface ProfileCardProps {
  profile: CatalogueProfile;
  isPending: boolean;
  onToggleFavorite: (profile: CatalogueProfile) => void;
  onContact: (profile: CatalogueProfile) => void;
  onView: (profile: CatalogueProfile) => void;
}

export const ProfileCard = ({
  profile,
  isPending,
  onToggleFavorite,
  onContact,
  onView,
}: ProfileCardProps) => {
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  const fullName = `${profile.firstName} ${profile.lastName}`;
  const hiddenSkills = profile.skills.length - VISIBLE_SKILLS;
  const canEmbed = profile.previewVideo !== null && isEmbeddableUrl(profile.previewVideo.url);

  const openVideo = () => {
    setIsVideoOpen(true);
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
          <span aria-hidden="true">{profile.isFavorite ? '★' : '☆'}</span>
          <span className="visually-hidden">
            {profile.isFavorite
              ? `Retirer ${fullName} des favoris`
              : `Ajouter ${fullName} aux favoris`}
          </span>
          <span aria-hidden="true">Favori</span>
        </button>
      </div>

      <div className="profile-card__meta">
        <span>{profile.sector}</span>
        <span aria-hidden="true">·</span>
        <span>{profile.location}</span>
        {profile.videoCount > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span>
              {profile.videoCount} vidéo{profile.videoCount > 1 ? 's' : ''}
            </span>
          </>
        )}
      </div>

      <CertificationBadge
        status={profile.certificationStatus}
        badge={profile.certificationBadge}
        score={profile.certificationScore}
      />

      {profile.skills.length > 0 && (
        <ul className="profile-card__skills" aria-label="Compétences">
          {profile.skills.slice(0, VISIBLE_SKILLS).map((skill) => (
            <li className="chip" key={skill.id}>
              {skill.name}
            </li>
          ))}
          {hiddenSkills > 0 && <li className="chip">+{hiddenSkills}</li>}
        </ul>
      )}

      {isVideoOpen && profile.previewVideo && canEmbed && (
        <iframe
          className="profile-card__video"
          src={profile.previewVideo.url}
          title={`Vidéo de présentation de ${fullName} : ${profile.previewVideo.title}`}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          // allow-same-origin only ever applies to a third-party player host
          // (isEmbeddableUrl enforces the allowlist), never to our own origin,
          // so the frame cannot lift its own sandbox.
          sandbox="allow-scripts allow-same-origin allow-presentation"
          allowFullScreen
        />
      )}

      {isVideoOpen && !canEmbed && (
        <p className="profile-card__contacted">Cette vidéo ne peut pas être affichée.</p>
      )}

      {profile.lastContactedAt && (
        <p className="profile-card__contacted">
          Déjà contacté le {formatDate(profile.lastContactedAt)}
        </p>
      )}

      <div className="profile-card__actions">
        {profile.previewVideo && !isVideoOpen && (
          <button type="button" className="button" onClick={openVideo}>
            Voir la vidéo
          </button>
        )}
        <button type="button" className="button button--primary" onClick={() => onContact(profile)}>
          Contacter
        </button>
      </div>
    </article>
  );
};
