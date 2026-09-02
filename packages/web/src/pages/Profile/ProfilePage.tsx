import type { JSX } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { SkillLevel } from '@profils-actifs/shared';
import { useProfile } from '../../hooks/useProfile.js';
import { VideoEmbed } from '../../components/VideoEmbed.js';
import { CertificationBadge } from '../../components/CertificationBadge.js';
import styles from './ProfilePage.module.css';

/** French, product-facing labels for `SkillLevel` — same pattern as `CertificationBadge`'s status labels. */
const SKILL_LEVEL_LABEL: Record<SkillLevel, string> = {
  BEGINNER: 'Débutant',
  INTERMEDIATE: 'Intermédiaire',
  ADVANCED: 'Avancé',
  EXPERT: 'Expert',
};

/**
 * `GET /profiles/:id` — public, no auth required (the brief requires a
 * profile to stay viewable without a recruiter account). Neither this page
 * nor `useProfile`/`getProfileById` ever attach an auth token; the one
 * exception — the profile's own owner previewing it before it's
 * approved — is handled entirely server-side (the API reads whatever
 * token happens to be present), so this page needs no special case for it.
 */
export function ProfilePage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { profile, loading, notFound, error } = useProfile(id);

  if (loading) {
    return <p role="status">Chargement du profil…</p>;
  }

  if (notFound) {
    return (
      <div className={styles.emptyState}>
        <p>Ce profil n’existe pas, ou n’est plus disponible.</p>
        <Link to="/profiles">Retour à la liste des profils</Link>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <p role="alert" className={styles.emptyState}>
        {error ?? 'Impossible de charger ce profil pour le moment.'}
      </p>
    );
  }

  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.headline}>{profile.headline ?? profile.sector}</h1>
        <CertificationBadge
          status={profile.certificationStatus}
          badge={profile.certificationBadge ?? null}
          score={profile.certificationScore ?? null}
        />
        <p className={styles.meta}>
          {profile.sector} · {profile.location}
        </p>
      </header>

      {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

      {profile.skills.length > 0 && (
        <section aria-labelledby="profile-skills-heading">
          <h2 id="profile-skills-heading" className={styles.sectionTitle}>
            Compétences
          </h2>
          <ul className={styles.skills}>
            {profile.skills.map((skill) => (
              <li key={skill.id} className={styles.skill}>
                {skill.skillName}
                <span className={styles.skillLevel}> · {SKILL_LEVEL_LABEL[skill.level]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="profile-videos-heading">
        <h2 id="profile-videos-heading" className={styles.sectionTitle}>
          Vidéos
        </h2>
        {profile.videos.length === 0 ? (
          <p className={styles.noVideo}>Aucune vidéo pour le moment.</p>
        ) : (
          <div className={styles.videos}>
            {profile.videos.map((video) => (
              <VideoEmbed key={video.id} type={video.type} url={video.url} />
            ))}
          </div>
        )}
      </section>
    </article>
  );
}
