import { Link } from 'react-router-dom';
import { AVAILABILITY_LABELS, type Profile } from '@profils-actifs/shared';
import { CertificationBadge } from './CertificationBadge.js';
import { VideoPlayer } from './VideoPlayer.js';

const VISIBLE_SKILLS = 4;

interface PublicProfileCardProps {
  profile: Profile;
  activeVideoId: string | null;
  onActivateVideo: (videoId: string) => void;
}

/** One profile on the public feed: its first approved video, who they are,
 *  where, and the certification state in words. */
export const PublicProfileCard = ({
  profile,
  activeVideoId,
  onActivateVideo,
}: PublicProfileCardProps) => {
  const [primaryVideo] = profile.videos;
  const fullName = `${profile.firstName} ${profile.lastName}`;
  const hiddenSkills = profile.skills.length - VISIBLE_SKILLS;

  return (
    <article className="card feed-card" aria-label={`Profil de ${fullName}`}>
      {primaryVideo ? (
        <VideoPlayer
          video={primaryVideo}
          active={activeVideoId === primaryVideo.id}
          onActivate={onActivateVideo}
        />
      ) : (
        <p className="video-placeholder">Aucune vidéo pour le moment</p>
      )}

      <div className="feed-card__body">
        <div>
          <Link className="feed-card__name" to={`/profils/${profile.id}`}>
            {fullName}
          </Link>
          {profile.headline && <p className="feed-card__headline">{profile.headline}</p>}
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
        </p>

        <CertificationBadge
          status={profile.certificationStatus}
          badge={profile.certificationBadge ?? null}
          score={profile.certificationScore ?? null}
        />

        {profile.skills.length > 0 && (
          <ul className="chip-list" aria-label="Compétences">
            {profile.skills.slice(0, VISIBLE_SKILLS).map((skill) => (
              <li className="chip" key={skill.id}>
                {skill.skillName}
              </li>
            ))}
            {hiddenSkills > 0 && <li className="chip">+{hiddenSkills}</li>}
          </ul>
        )}
      </div>
    </article>
  );
};
