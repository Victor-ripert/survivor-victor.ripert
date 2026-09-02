import type { JSX } from 'react';
import type { CertificationStatus } from '@profils-actifs/shared';
import styles from './CertificationBadge.module.css';

export interface CertificationBadgeProps {
  status: CertificationStatus;
  badge?: string;
}

/** French, product-facing fallback label for each status — shown whenever there's no earned badge name to display instead. */
const STATUS_LABEL: Record<CertificationStatus, string> = {
  PENDING: 'Certification non commencée',
  IN_PROGRESS: 'Certification en cours',
  COMPLETED: 'Certifié JEB',
  REJECTED: 'Certification non obtenue',
};

/**
 * Maps each status to its CSS Module class. A separate table from
 * `STATUS_LABEL` rather than deriving one from the other (e.g.
 * `status.toLowerCase()`) — `IN_PROGRESS` wouldn't turn into a valid single
 * CSS class name that way, and an explicit table doesn't break if either
 * side's naming changes independently later.
 */
const STATUS_CLASS: Record<CertificationStatus, string> = {
  PENDING: 'pending',
  IN_PROGRESS: 'inProgress',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
};

/**
 * Purely presentational status pill for `Profile.certificationStatus` (and
 * the resolved `Profile.certificationBadge` name, once one's been earned).
 * Takes only `{ status, badge }` and fetches nothing itself — whoever
 * renders it (the profile page, a feed card, a recruiter's catalogue row)
 * is responsible for having already loaded the profile.
 *
 * Not made keyboard-focusable on purpose: with no `onClick`/`href` in its
 * prop contract, there's nothing for a keyboard user to *do* with it — a
 * static element in the tab order that does nothing on activation is a
 * worse experience than one that isn't a stop at all. If this ever becomes
 * a link (e.g. "learn about certification"), that wrapping element gets
 * the focus state, and nothing here resets `outline`, so it wouldn't need
 * to fight this component's own styling to get one.
 */
export function CertificationBadge({ status, badge }: CertificationBadgeProps): JSX.Element {
  const label = status === 'COMPLETED' && badge ? badge : STATUS_LABEL[status];

  return (
    <span className={`${styles.badge} ${styles[STATUS_CLASS[status]]}`} role="status">
      {label}
    </span>
  );
}
