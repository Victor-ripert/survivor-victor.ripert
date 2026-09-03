import { ModerationStatus, Prisma, UserRole } from '@prisma/client';
import { ADULT_AGE } from '@profils-actifs/shared';

/**
 * Who may see what. Every read surface derives its `where` from these three
 * filters so a rule such as "a pending video is served nowhere" is written
 * once, and a change to it reaches the feed, the profile page, the video list
 * and the recruiter catalogue together.
 */

/** Latest birth date an adult can have: born on or before it means at least
 *  `ADULT_AGE` years old. Computed in UTC because birth dates are stored as
 *  UTC midnight. */
export const adultBirthDateCutoff = (now: Date = new Date()): Date =>
  new Date(Date.UTC(now.getUTCFullYear() - ADULT_AGE, now.getUTCMonth(), now.getUTCDate()));

/** Accounts created before the birth date existed are treated as adults —
 *  see docs/legal/accounts-without-birthdate.md. */
export const isMinor = (birthDate: Date | null, now: Date = new Date()): boolean =>
  birthDate !== null && birthDate > adultBirthDateCutoff(now);

/**
 * Videos a recruiter — or the public — is allowed to see: approved ones, and
 * nothing else. Moderation is *a priori* (brief §7.9.2): the ministry answers
 * for a video from the moment it is online, so nothing is online before an
 * administrator approved it.
 */
export const publishedVideoFilter: Prisma.VideoWhereInput = {
  moderationStatus: ModerationStatus.APPROVED,
};

/** In-memory twin of `publishedVideoFilter`, for rows already fetched. */
export const isPublished = (video: { moderationStatus: ModerationStatus }): boolean =>
  video.moderationStatus === ModerationStatus.APPROVED;

/**
 * Profiles a recruiter is allowed to see: an active job-seeker account whose
 * profile has not been rejected by moderation. Profiles still awaiting review
 * stay visible — the platform is opt-in for job-seekers and a moderation
 * backlog must not silently hide them — while a rejected profile disappears
 * from every recruiter-facing surface.
 */
export const visibleProfileFilter: Prisma.ProfileWhereInput = {
  moderationStatus: { not: ModerationStatus.REJECTED },
  user: { isActive: true, role: UserRole.APPLICANT },
};

/**
 * Profiles anyone may see without an account: approved, active, and held by
 * an adult. Minors keep out of every surface browsable without a recruiter
 * account (brief §7.9.1); the recruiter catalogue is role-gated and still
 * lists them.
 */
export const publicProfileFilter = (now: Date = new Date()): Prisma.ProfileWhereInput => ({
  moderationStatus: ModerationStatus.APPROVED,
  user: {
    isActive: true,
    role: UserRole.APPLICANT,
    OR: [{ birthDate: null }, { birthDate: { lte: adultBirthDateCutoff(now) } }],
  },
});

interface ProfileVisibilityRow {
  moderationStatus: ModerationStatus;
  user: { isActive: boolean; birthDate: Date | null };
}

/** In-memory twin of `publicProfileFilter`, for a row already fetched by id. */
export const isPubliclyVisible = (profile: ProfileVisibilityRow, now: Date = new Date()): boolean =>
  profile.moderationStatus === ModerationStatus.APPROVED &&
  profile.user.isActive &&
  !isMinor(profile.user.birthDate, now);
