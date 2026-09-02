import type { InteractionType } from '@prisma/client';

export interface InteractionSeed {
  type: InteractionType;
  /** Index into the `applicants` fixture list. */
  applicant: number;
  /** How many days back the interaction happened. */
  daysAgo: number;
}

/** Spread over the dashboards' 30-day window so the trend charts render a real
 *  curve rather than a single spike on the seeding day. */
export const interactionPlan: InteractionSeed[] = [
  { type: 'VIEW', applicant: 0, daysAgo: 26 },
  { type: 'VIEW', applicant: 1, daysAgo: 22 },
  { type: 'VIEW', applicant: 2, daysAgo: 18 },
  { type: 'VIEW', applicant: 4, daysAgo: 12 },
  { type: 'VIEW', applicant: 6, daysAgo: 9 },
  { type: 'VIEW', applicant: 7, daysAgo: 4 },
  { type: 'FAVORITE', applicant: 0, daysAgo: 25 },
  { type: 'FAVORITE', applicant: 6, daysAgo: 8 },
  { type: 'FAVORITE', applicant: 10, daysAgo: 3 },
  { type: 'CONTACT', applicant: 0, daysAgo: 24 },
  { type: 'CONTACT', applicant: 2, daysAgo: 17 },
  { type: 'CONTACT', applicant: 6, daysAgo: 7 },
  { type: 'MESSAGE', applicant: 0, daysAgo: 2 },
];

export const CONTACT_MESSAGE =
  'Bonjour, votre profil correspond à un poste que nous ouvrons. Seriez-vous disponible pour un échange ?';
