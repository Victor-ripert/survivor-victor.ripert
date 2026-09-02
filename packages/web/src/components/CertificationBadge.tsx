import type { CertificationStatus } from '@profils-actifs/shared';

const LABELS: Record<CertificationStatus, string> = {
  COMPLETED: 'Certifié',
  IN_PROGRESS: 'Certification en cours',
  PENDING: 'Non certifié',
  REJECTED: 'Certification refusée',
};

const MODIFIERS: Record<CertificationStatus, string> = {
  COMPLETED: 'badge--certified',
  IN_PROGRESS: 'badge--in-progress',
  PENDING: '',
  REJECTED: 'badge--rejected',
};

interface CertificationBadgeProps {
  status: CertificationStatus;
  badge: string | null;
  score: number | null;
}

/** Status is always spelled out in words: colour alone never carries it. */
export const CertificationBadge = ({ status, badge, score }: CertificationBadgeProps) => {
  const label = status === 'COMPLETED' && badge ? badge : LABELS[status];
  const detail = status === 'COMPLETED' && score !== null ? ` — ${score}/100` : '';

  return (
    <span className={`badge ${MODIFIERS[status]}`.trim()} role="status">
      <span className="badge__dot" aria-hidden="true" />
      {label}
      {detail}
    </span>
  );
};
