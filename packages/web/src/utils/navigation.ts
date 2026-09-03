import type { UserRole } from '@profils-actifs/shared';

/** Where each role lands after signing in. */
export const HOME_BY_ROLE: Record<UserRole, string> = {
  APPLICANT: '/mon-profil',
  RECRUITER: '/recruteur',
  ADMIN: '/admin',
};

export interface NavigationEntry {
  to: string;
  label: string;
  /** Empty means visible to everyone, signed in or not. */
  roles: UserRole[];
  end?: boolean;
}

export const NAVIGATION: NavigationEntry[] = [
  { to: '/', label: 'Profils', roles: [], end: true },
  { to: '/mon-profil', label: 'Mon profil', roles: ['APPLICANT'] },
  { to: '/certification', label: 'Certification', roles: ['APPLICANT'] },
  { to: '/recruteur', label: 'Tableau de bord', roles: ['RECRUITER', 'ADMIN'], end: true },
  { to: '/recruteur/catalogue', label: 'Catalogue', roles: ['RECRUITER', 'ADMIN'] },
  { to: '/recruteur/favoris', label: 'Ma sélection', roles: ['RECRUITER', 'ADMIN'] },
  { to: '/recruteur/interactions', label: 'Historique', roles: ['RECRUITER', 'ADMIN'] },
  { to: '/admin', label: 'Administration', roles: ['ADMIN'], end: true },
  { to: '/admin/moderation-profils', label: 'Profils à valider', roles: ['ADMIN'] },
  { to: '/admin/moderation-videos', label: 'Vidéos à valider', roles: ['ADMIN'] },
  { to: '/admin/questionnaire', label: 'Questionnaire', roles: ['ADMIN'] },
];
