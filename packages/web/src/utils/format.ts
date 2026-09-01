import type { CertificationStatus, InteractionType } from '@profils-actifs/shared';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const percentFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'percent',
  maximumFractionDigits: 0,
});

export const formatDate = (isoDate: string): string => dateFormatter.format(new Date(isoDate));

export const formatPercent = (ratio: number): string => percentFormatter.format(ratio);

export const formatCount = (count: number): string => count.toLocaleString('fr-FR');

export const INTERACTION_LABELS: Record<InteractionType, string> = {
  VIEW: 'Consultations',
  CONTACT: 'Prises de contact',
  FAVORITE: 'Mises en favori',
  MESSAGE: 'Messages',
};

export const CERTIFICATION_LABELS: Record<CertificationStatus, string> = {
  PENDING: 'Non commencée',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminée',
  REJECTED: 'Refusée',
};

export const ROLE_LABELS: Record<string, string> = {
  APPLICANT: 'Candidats',
  RECRUITER: 'Recruteurs',
  ADMIN: 'Administrateurs',
};

/** Falls back to the raw value so an enum added server-side still renders. */
export const translate = (dictionary: Record<string, string>, key: string): string =>
  dictionary[key] ?? key;
