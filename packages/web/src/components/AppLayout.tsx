import { NavLink, Outlet } from 'react-router-dom';
import type { UserRole } from '@profils-actifs/shared';
import { useAuth } from '../hooks/useAuth.js';

interface NavigationEntry {
  to: string;
  label: string;
  roles: UserRole[];
}

const NAVIGATION: NavigationEntry[] = [
  { to: '/recruteur', label: 'Tableau de bord', roles: ['RECRUITER', 'ADMIN'] },
  { to: '/recruteur/catalogue', label: 'Catalogue', roles: ['RECRUITER', 'ADMIN'] },
  { to: '/recruteur/favoris', label: 'Ma sélection', roles: ['RECRUITER', 'ADMIN'] },
  { to: '/recruteur/interactions', label: 'Historique', roles: ['RECRUITER', 'ADMIN'] },
  { to: '/admin', label: 'Administration', roles: ['ADMIN'] },
];

export const AppLayout = () => {
  const { user, logout } = useAuth();

  const entries = NAVIGATION.filter((entry) => user && entry.roles.includes(user.role));

  return (
    <div className="app-shell">
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>

      <header className="app-header">
        <span className="app-header__brand" translate="no">
          ProfilsActifs
        </span>

        <nav className="app-nav" aria-label="Navigation principale">
          {entries.map((entry) => (
            <NavLink key={entry.to} to={entry.to} end={entry.to === '/recruteur'}>
              {entry.label}
            </NavLink>
          ))}
        </nav>

        {user && (
          <div className="app-header__user">
            <span>
              {user.firstName} {user.lastName}
            </span>
            <button type="button" className="button button--subtle" onClick={logout}>
              Déconnexion
            </button>
          </div>
        )}
      </header>

      <main className="app-main" id="contenu">
        <Outlet />
      </main>
    </div>
  );
};
