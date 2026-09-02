import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import type { Profile } from '@profils-actifs/shared';
import { VideoEmbed } from './VideoEmbed.js';
import { CertificationBadge } from './CertificationBadge.js';
import styles from './PublicProfileCard.module.css';

export interface PublicProfileCardProps {
  profile: Profile;
}

/**
 * One profile's card in the public feed (`FeedPage`) — not to be confused
 * with `ProfileCard`, the recruiter catalogue's own card for
 * `CatalogueProfile`. The two solve different problems for different
 * audiences (this one is public, has no favourite/contact actions, and
 * renders a `Profile` DTO rather than a catalogue row) and were built
 * independently; this one was renamed from `ProfileCard` specifically to
 * stop colliding with that one on merge, not because either was wrong.
 *
 * Shows its primary video via `VideoEmbed` (which already handles both
 * `EXTERNAL_LINK` and `UPLOAD` uniformly, so this component doesn't need
 * to care which one it's showing) and its certification state via
 * `CertificationBadge`.
 *
 * Only the headline is wrapped in the link to `/profiles/{id}` (the public
 * profile page), not the whole card — the video itself is independently
 * keyboard-focusable and operable (see `VideoEmbed`), and putting a
 * focusable element inside an `<a>` produces a confusing, invalid nested
 * focus target. This keeps "click the video to play it" and "click the
 * title to see the full profile" as two clearly separate actions.
 */
export function PublicProfileCard({ profile }: PublicProfileCardProps): JSX.Element {
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
        <CertificationBadge
          status={profile.certificationStatus}
          badge={profile.certificationBadge ?? null}
          score={profile.certificationScore ?? null}
        />
      </div>
    </article>
  );
}
