import type { CertificationStatus, InteractionType, SkillLevel, UserRole } from './domain.js';
import type { AvailabilityStatus } from './profile.js';

/** One catalogue row. Deliberately carries no email: recruiters reach an
 *  applicant through `POST /interactions/{recipientId}`, which keeps the
 *  contact auditable and notifies the applicant. */
export interface CatalogueProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  headline: string | null;
  location: string;
  sector: string;
  certificationStatus: CertificationStatus;
  certificationScore: number | null;
  certificationBadge: string | null;
  /** `null` when the candidate has not declared one — never coerced to a value. */
  availability: AvailabilityStatus | null;
  skills: CatalogueSkill[];
  videoCount: number;
  previewVideo: CataloguePreviewVideo | null;
  isFavorite: boolean;
  lastContactedAt: string | null;
  updatedAt: string;
}

export interface CatalogueSkill {
  id: string;
  name: string;
  level: SkillLevel;
}

export interface CataloguePreviewVideo {
  id: string;
  title: string;
  url: string;
}

/**
 * Orderings a recruiter may ask for, one per professional criterion named in
 * the 8 September letter: date (`recent`), certification (`certification` by
 * status, `score` by result), sector, location, availability. Every one rests
 * on something the candidate declared about their work, and none on anything
 * resembling an audience measurement.
 *
 * `name` was withdrawn on 2026-09-08; the reasoning is in
 * docs/livrables/note-algorithme-de-classement.md §2.1.
 */
export const CATALOGUE_SORTS = [
  'recent',
  'certification',
  'score',
  'sector',
  'location',
  'availability',
] as const;
export type CatalogueSort = (typeof CATALOGUE_SORTS)[number];

/** The ordering applied when the caller asks for none. Declared once so the
 *  validator, the URL parser and the contract cannot drift apart. */
export const CATALOGUE_DEFAULT_SORT: CatalogueSort = 'recent';

/** Query string accepted by `GET /recruiter/catalogue`. */
export interface CatalogueQuery {
  page?: number;
  limit?: number;
  q?: string;
  sector?: string;
  location?: string;
  skills?: string[];
  certifiedOnly?: boolean;
  minScore?: number;
  hasVideo?: boolean;
  availability?: AvailabilityStatus;
  favoritesOnly?: boolean;
  sort?: CatalogueSort;
}

export interface FacetValue {
  value: string;
  count: number;
}

/** Filter values that actually exist in the catalogue, so the UI never offers
 *  a dropdown option that returns zero profiles. */
export interface CatalogueFacets {
  sectors: FacetValue[];
  locations: FacetValue[];
  skills: FacetValue[];
  /** Declared availabilities that actually occur, soonest first. Profiles that
   *  declared none are not a facet value — they are the remainder. */
  availabilities: FacetValue[];
}

export interface InteractionCounterpart {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  profileId: string | null;
}

export interface InteractionDto {
  id: string;
  type: InteractionType;
  message: string | null;
  isViewed: boolean;
  isFavorite: boolean;
  createdAt: string;
  recipientId: string;
  createdById: string;
  counterpart: InteractionCounterpart;
}

/** A single bucket of a daily time series; `date` is an ISO calendar day. */
export interface DailyCount {
  date: string;
  count: number;
}

export interface LabelledCount {
  label: string;
  count: number;
}

export interface RecruiterDashboard {
  totals: {
    profilesViewed: number;
    contactsSent: number;
    favorites: number;
    applicantsReached: number;
  };
  certifiedShare: number;
  activityLast30Days: DailyCount[];
  interactionsByType: LabelledCount[];
  topSectorsReached: LabelledCount[];
  recentContacts: InteractionDto[];
}

export interface AdminDashboard {
  totals: {
    totalProfiles: number;
    activeApplicants: number;
    totalRecruiters: number;
    totalInteractions: number;
    pendingModeration: number;
  };
  certificationRate: number;
  usersByRole: LabelledCount[];
  profilesByCertificationStatus: LabelledCount[];
  interactionsByType: LabelledCount[];
  topSectors: LabelledCount[];
  signupsLast30Days: DailyCount[];
  interactionsLast30Days: DailyCount[];
}
