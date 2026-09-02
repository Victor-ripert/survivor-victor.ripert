/**
 * Mirrors `schema.prisma`'s `ModerationStatus` enum. Lives in its own file
 * (rather than inside `profile.ts`, where it originated) because both
 * `Profile` and `Video` carry their own `moderationStatus` field — a
 * profile being `APPROVED` does not by itself approve its individual
 * videos, each is reviewed independently — and `profile.ts` importing
 * `Video` from `video.ts` means `video.ts` can't import back from
 * `profile.ts` without a cycle.
 */
export const MODERATION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

/** Mirrors `schema.prisma`'s `ModerationAction` enum — what an admin *does*, distinct from `ModerationStatus` (what the target's state *is*). */
export const MODERATION_ACTIONS = ['APPROVE', 'REJECT', 'FLAG', 'REQUIRE_CHANGES'] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];
