import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Profile } from '@profils-actifs/shared';
import { Icon } from '../../components/Icon.js';
import { ErrorNotice, LoadingRow, Notice } from '../../components/StatusMessages.js';
import { useAsyncResource } from '../../hooks/useAsyncResource.js';
import { fetchOwnProfile } from '../../services/profiles.js';
import { CertificationCard } from './CertificationCard.js';
import { ProfileForm } from './ProfileForm.js';
import { SkillsSection } from './SkillsSection.js';
import { VideosSection } from './VideosSection.js';

const StatusBanner = ({ profile }: { profile: Profile | null }) => {
  if (!profile) {
    return (
      <Notice tone="info">
        <p>
          <strong>Bienvenue.</strong> Renseignez votre secteur et votre localisation pour créer
          votre profil ; vous pourrez ensuite ajouter des compétences et une vidéo.
        </p>
      </Notice>
    );
  }

  switch (profile.moderationStatus) {
    case 'APPROVED':
      return (
        <Notice tone="success">
          <p>
            <strong>Profil publié.</strong> Il apparaît sur le fil public et dans le catalogue des
            recruteurs. <Link to={`/profils/${profile.id}`}>Voir mon profil public</Link>
          </p>
        </Notice>
      );
    case 'REJECTED':
      return (
        <Notice tone="error" role="status">
          <p>
            <strong>Profil retiré par la modération.</strong> Il n’est visible que par vous.
            Corrigez son contenu, un administrateur le réexaminera.
          </p>
        </Notice>
      );
    default:
      return (
        <Notice tone="warning">
          <p>
            <strong>En attente de validation.</strong> Un administrateur relit votre profil avant sa
            publication. Vous pouvez continuer à le compléter.
          </p>
        </Notice>
      );
  }
};

/** The candidate's own space: profile, skills, videos and certification, all
 *  writing back to `POST /profiles/me` and its sibling routes. */
export const MyProfilePage = () => {
  const load = useCallback((signal: AbortSignal) => fetchOwnProfile(signal), []);
  const { data, error, isLoading, reload } = useAsyncResource(load);
  // Mutations return the fresh profile; keeping it here avoids a refetch
  // after every save while the initial load still comes from the API.
  const [override, setOverride] = useState<Profile | null>(null);

  if (isLoading && data === null && !override)
    return <LoadingRow label="Chargement de votre profil…" />;
  if (error) return <ErrorNotice error={error} onRetry={reload} />;

  const profile = override ?? data ?? null;

  return (
    <div className="page-reading stack stack--loose">
      <header className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1>Mon profil</h1>
          <p className="page-header__subtitle">
            Ce que les recruteurs et le public verront une fois votre profil validé.
          </p>
        </div>
        {profile && (
          <Link className="button" to={`/profils/${profile.id}`}>
            <Icon name="eye" />
            Voir mon profil public
          </Link>
        )}
      </header>

      <StatusBanner profile={profile} />

      <div className="two-col">
        <div className="stack stack--loose">
          <ProfileForm key={profile?.id ?? 'new'} profile={profile} onSaved={setOverride} />
          <VideosSection profile={profile} onChanged={setOverride} />
        </div>
        <div className="stack stack--loose">
          <CertificationCard profile={profile} />
          <SkillsSection profile={profile} onChanged={setOverride} />
        </div>
      </div>
    </div>
  );
};
