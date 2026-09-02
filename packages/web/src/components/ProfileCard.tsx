import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import type { Profile } from '@profils-actifs/shared';
import { VideoEmbed } from './VideoEmbed.js';
import { CertificationBadge } from './CertificationBadge.js';
import styles from './ProfileCard.module.css';

export interface ProfileCardProps {
  profile: Profile;
}

/**
 * One profile's card in the feed. Shows its primary video via `VideoEmbed`
 * (which already handles both `EXTERNAL_LINK` and `UPLOAD` uniformly, so
 * this component doesn't need to care which one it's showing) and its
 * certification state via `CertificationBadge`.
 *
 * Only the headline is wrapped in the link to `/profiles/{id}` (the public
 * profile page), not the whole card — the video itself is independently
 * keyboard-focusable and operable (see `VideoEmbed`), and putting a
 * focusable element inside an `<a>` produces a confusing, invalid nested
 * focus target. This keeps "click the video to play it" and "click the
 * title to see the full profile" as two clearly separate actions.
 */
export function ProfileCard({ profile }: ProfileCardProps): JSX.Element {
  const primaryVideo = profile.videos[0];

  return (
    <article className={styles.card}>
      <div className={styles.media}>
        {primaryVideo ? (
          <VideoEmbed type={primaryVideo.type} url={primaryVideo.url} />
        ) : (
          <p className={styles.noVideo}>Aucune vidéo pour le moment</p>
        )}
      </div>

      <div className={styles.body}>
        <Link to={`/profiles/${profile.id}`} className={styles.link}>
          <h3 className={styles.headline}>{profile.headline ?? profile.sector}</h3>
        </Link>
        <p className={styles.meta}>
          {profile.sector} · {profile.location}
        </p>
        <CertificationBadge status={profile.certificationStatus} badge={profile.certificationBadge} />
      </div>
    </article>
  );
}
