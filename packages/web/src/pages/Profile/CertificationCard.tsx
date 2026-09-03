import { Link } from 'react-router-dom';
import type { Profile } from '@profils-actifs/shared';
import { CertificationBadge } from '../../components/CertificationBadge.js';
import { Icon } from '../../components/Icon.js';

interface CertificationCardProps {
  profile: Profile | null;
}

const COPY: Record<Profile['certificationStatus'], { title: string; hint: string; cta: string }> = {
  PENDING: {
    title: 'Non commencée',
    hint: '100 questions, reprise possible à tout moment. Le badge s’affiche sur votre profil.',
    cta: 'Passer le questionnaire',
  },
  IN_PROGRESS: {
    title: 'En cours',
    hint: 'Vos réponses sont enregistrées au fur et à mesure.',
    cta: 'Reprendre le questionnaire',
  },
  COMPLETED: {
    title: 'Certification obtenue',
    hint: 'Le score et le badge sont visibles par les recruteurs.',
    cta: 'Repasser le questionnaire',
  },
  REJECTED: {
    title: 'Score insuffisant',
    hint: 'Vous pouvez repasser le questionnaire quand vous le souhaitez.',
    cta: 'Repasser le questionnaire',
  },
};

export const CertificationCard = ({ profile }: CertificationCardProps) => {
  const status = profile?.certificationStatus ?? 'PENDING';
  const copy = COPY[status];

  return (
    <section className="card panel" aria-labelledby="certification-title">
      <h2 id="certification-title" className="panel__title">
        Certification JEB
      </h2>

      <div className="certification-summary">
        <span className="certification-summary__icon">
          <Icon name="badge" size={24} />
        </span>
        <div>
          <p className="certification-summary__title">{copy.title}</p>
          <p className="certification-summary__hint">{copy.hint}</p>
        </div>
      </div>

      {profile && status === 'COMPLETED' && (
        <CertificationBadge
          status={status}
          badge={profile.certificationBadge ?? null}
          score={profile.certificationScore ?? null}
        />
      )}

      {profile ? (
        <Link className="button button--primary button--lg" to="/certification">
          {copy.cta}
        </Link>
      ) : (
        <p className="panel__subtitle">
          Enregistrez d’abord votre profil : le badge a besoin d’un profil sur lequel s’afficher.
        </p>
      )}
    </section>
  );
};
