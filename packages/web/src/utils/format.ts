import type {
  AttemptStatus,
  CertificationStatus,
  InteractionType,
  ModerationStatus,
  SkillLevel,
  UserRole,
} from '@profils-actifs/shared';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const percentFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'percent',
  maximumFractionDigits: 0,
});

export const formatDate = (isoDate: string): string => dateFormatter.format(new Date(isoDate));

export const formatDateTime = (isoDate: string): string =>
  dateTimeFormatter.format(new Date(isoDate));

export const formatPercent = (ratio: number): string => percentFormatter.format(ratio);

export const formatCount = (count: number): string => count.toLocaleString('fr-FR');

/** `92` -> `1:32`, for a poster's duration chip. */
export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
};

export const pluralize = (count: number, singular: string, plural = `${singular}s`): string =>
  `${formatCount(count)} ${count > 1 ? plural : singular}`;

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

export const ROLE_LABELS: Record<UserRole, string> = {
  APPLICANT: 'Candidats',
  RECRUITER: 'Recruteurs',
  ADMIN: 'Administrateurs',
};

export const ROLE_TITLES: Record<UserRole, string> = {
  APPLICANT: 'candidat',
  RECRUITER: 'recruteur',
  ADMIN: 'administration',
};

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  BEGINNER: 'Débutant',
  INTERMEDIATE: 'Intermédiaire',
  ADVANCED: 'Avancé',
  EXPERT: 'Expert',
};

export const MODERATION_STATUS_LABELS: Record<ModerationStatus, string> = {
  PENDING: 'En attente de validation',
  APPROVED: 'Validée',
  REJECTED: 'Refusée',
};

export const ATTEMPT_STATUS_LABELS: Record<AttemptStatus, string> = {
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminée',
  ABANDONED: 'Annulée',
  EXPIRED: 'Expirée',
};

/** Falls back to the raw value so an enum added server-side still renders. */
export const translate = (dictionary: Record<string, string>, key: string): string =>
  dictionary[key] ?? key;
