/**
 * Mirrors `schema.prisma`'s `UserRole` enum — same reasoning as
 * `moderation.ts`'s mirrors: `web` can't depend on `@prisma/client`
 * (server-only), but still needs this to type a decoded JWT payload's
 * `role` claim (see `utils/jwt.ts`) for frontend-side route gating.
 */
export const USER_ROLES = ['APPLICANT', 'RECRUITER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];
