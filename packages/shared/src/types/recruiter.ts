import type { CertificationStatus, InteractionType, SkillLevel, UserRole } from './domain.js';

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

export const CATALOGUE_SORTS = ['recent', 'score', 'name'] as const;
export type CatalogueSort = (typeof CATALOGUE_SORTS)[number];

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
