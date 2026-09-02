import type { ReactNode } from 'react';
import type { ApiError } from '../services/api.js';
import { Icon } from './Icon.js';

export const LoadingRow = ({ label = 'Chargement…' }: { label?: string }) => (
  <div className="loading-row" role="status">
    <span className="spinner" aria-hidden="true" />
    <span>{label}</span>
  </div>
);

export type NoticeTone = 'info' | 'success' | 'warning' | 'error';

const ICON_BY_TONE: Record<NoticeTone, 'info' | 'check' | 'clock' | 'alert'> = {
  info: 'info',
  success: 'check',
  warning: 'clock',
  error: 'alert',
};

interface NoticeProps {
  tone: NoticeTone;
  children: ReactNode;
  /** `alert` interrupts, `status` is polite; errors default to `alert`. */
  role?: 'alert' | 'status';
  className?: string;
}

/** A banner the reader cannot miss, with its meaning carried by words and an
 *  icon rather than by colour alone. */
export const Notice = ({ tone, children, role, className }: NoticeProps) => (
  <div
    className={`alert alert--${tone}${className ? ` ${className}` : ''}`}
    role={role ?? (tone === 'error' ? 'alert' : 'status')}
  >
    <Icon name={ICON_BY_TONE[tone]} size={18} />
    <div className="alert__body">{children}</div>
  </div>
);

interface ErrorNoticeProps {
  error: ApiError;
  onRetry?: () => void;
}

export const ErrorNotice = ({ error, onRetry }: ErrorNoticeProps) => (
  <Notice tone="error">
    <p>{error.message}</p>
    {onRetry && (
      <p>
        <button type="button" className="button" onClick={onRetry}>
          Réessayer
        </button>
      </p>
    )}
  </Notice>
);

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyState = ({ title, description, action }: EmptyStateProps) => (
  <div className="empty-state">
    <h2>{title}</h2>
    {description && <p>{description}</p>}
    {action && <p style={{ marginTop: 'var(--space-4)' }}>{action}</p>}
  </div>
);
