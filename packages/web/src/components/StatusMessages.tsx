import type { ApiError } from '../services/api.js';

export const LoadingRow = ({ label = 'Chargement…' }: { label?: string }) => (
  <div className="loading-row" role="status">
    <span className="spinner" aria-hidden="true" />
    <span>{label}</span>
  </div>
);

interface ErrorNoticeProps {
  error: ApiError;
  onRetry?: () => void;
}

export const ErrorNotice = ({ error, onRetry }: ErrorNoticeProps) => (
  <div className="alert alert--error" role="alert">
    <p>{error.message}</p>
    {onRetry && (
      <p style={{ marginTop: 'var(--space-2)' }}>
        <button type="button" className="button" onClick={onRetry}>
          Réessayer
        </button>
      </p>
    )}
  </div>
);

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState = ({ title, description, action }: EmptyStateProps) => (
  <div className="empty-state">
    <h2>{title}</h2>
    {description && <p>{description}</p>}
    {action && <p style={{ marginTop: 'var(--space-4)' }}>{action}</p>}
  </div>
);
