import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { UserRole } from '@profils-actifs/shared';
import { useAuth } from '../hooks/useAuth.js';
import { LoadingRow } from './StatusMessages.js';

interface ProtectedRouteProps {
  roles: readonly UserRole[];
  children: ReactNode;
}

/**
 * Guards a route on the client for navigation purposes only — the API enforces
 * the same rule on every request, so a forged role in the browser gains
 * nothing.
 */
export const ProtectedRoute = ({ roles, children }: ProtectedRouteProps) => {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <LoadingRow label="Vérification de la session…" />;

  if (status === 'anonymous' || !user) {
    return <Navigate to="/connexion" state={{ from: location.pathname }} replace />;
  }

  if (!roles.includes(user.role)) {
    return (
      <div className="empty-state" role="alert">
        <h2>Accès refusé</h2>
        <p>Votre rôle ne donne pas accès à cette page.</p>
      </div>
    );
  }

  return <>{children}</>;
};
