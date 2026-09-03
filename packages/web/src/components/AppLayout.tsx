import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useUnreadNotifications } from '../hooks/useUnreadNotifications.js';
import { getEnv } from '../utils/env.js';
import { ROLE_TITLES } from '../utils/format.js';
import { NAVIGATION } from '../utils/navigation.js';
import { BrandBlock } from './BrandBlock.js';
import { ErrorBoundary } from './ErrorBoundary.js';

const apiOrigin = (): string => {
  try {
    return new URL(getEnv('VITE_API_URL', 'http://localhost:3000/api')).origin;
  } catch {
    return '';
  }
};

export const AppLayout = () => {
  const { user, status, logout } = useAuth();
  const { pathname } = useLocation();
  const unread = useUnreadNotifications(status === 'authenticated');

  const entries = NAVIGATION.filter(
    (entry) => entry.roles.length === 0 || (user !== null && entry.roles.includes(user.role)),
  );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>

      {/* Two tiers: the bandeau carries the bloc-marque and the account
          actions, the navigation sits below on its own rule. The split is what
          leaves the marque a full line and keeps its protection zone clear at
          every width. */}
      <header className="app-header">
        <div className="app-header__top">
          <BrandBlock />

          {user ? (
            <div className="app-header__user">
              <span>
                {user.firstName} {user.lastName} · {ROLE_TITLES[user.role]}
              </span>
              <button type="button" className="button button--subtle" onClick={logout}>
                Déconnexion
              </button>
            </div>
          ) : (
            status === 'anonymous' && (
              <div className="app-header__user">
                <Link className="button" to="/connexion">
                  Connexion
                </Link>
                <Link className="button button--primary" to="/inscription">
                  Créer mon profil
                </Link>
              </div>
            )
          )}
        </div>

        <nav className="app-nav" aria-label="Navigation principale">
          {entries.map((entry) => (
            <NavLink key={entry.to} to={entry.to} end={entry.end ?? false}>
              {entry.label}
            </NavLink>
          ))}
          {user && (
            <NavLink to="/notifications">
              Notifications
              {unread > 0 && (
                <span className="nav-badge" aria-label={`${unread} non lues`}>
                  {unread}
                </span>
              )}
            </NavLink>
          )}
        </nav>
      </header>

      <main className="app-main" id="contenu">
        {/* Keyed on the path so a crash on one page does not survive a
            navigation: the header and the nav stay usable either way. */}
        <ErrorBoundary resetKey={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

      <footer className="app-footer">
        <span className="app-footer__identity">
          <span className="app-footer__ministry">Ministère du Job et Bonheur</span>
          <span>ProfilsActifs — démonstrateur JEB/DNI/2026-003</span>
        </span>
        <span className="app-footer__links">
          <a href={`${apiOrigin()}/api/docs/`}>Contrat d’API</a>
          <a href={`${apiOrigin()}/api/health`}>Sonde de santé</a>
        </span>
      </footer>
    </div>
  );
};
