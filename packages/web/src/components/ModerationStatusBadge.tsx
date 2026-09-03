import type { ModerationStatus } from '@profils-actifs/shared';
import { MODERATION_STATUS_LABELS } from '../utils/format.js';

const MODIFIERS: Record<ModerationStatus, string> = {
  PENDING: 'badge--pending',
  APPROVED: 'badge--approved',
  REJECTED: 'badge--rejected',
};

interface ModerationStatusBadgeProps {
  status: ModerationStatus;
  labels?: Partial<Record<ModerationStatus, string>>;
}

export const ModerationStatusBadge = ({ status, labels }: ModerationStatusBadgeProps) => (
  <span className={`badge ${MODIFIERS[status]}`}>
    {labels?.[status] ?? MODERATION_STATUS_LABELS[status]}
  </span>
);
