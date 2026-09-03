/**
 * Mirrors `schema.prisma`'s `UserRole` enum — same reasoning as
 * `moderation.ts`'s mirrors: `web` can't depend on `@prisma/client`
 * (server-only), but still needs this to type the authenticated user for
 * frontend-side route gating.
 */
export const USER_ROLES = ['APPLICANT', 'RECRUITER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Roles a visitor may pick at registration. `ADMIN` accounts come from the seed. */
export const SELF_REGISTRABLE_ROLES = ['APPLICANT', 'RECRUITER'] as const;
export type SelfRegistrableRole = (typeof SELF_REGISTRABLE_ROLES)[number];

export const PASSWORD_MIN_LENGTH = 8;

/** The authenticated user as `POST /auth/login`, `POST /auth/register` and
 *  `GET /auth/me` return it. Never carries the password hash. */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  /** ISO date, only ever set for job-seekers (brief §7.9.1). */
  birthDate: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}
