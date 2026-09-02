import type { ModerationStatus } from './domain.js';

/**
 * Wire format for the *a priori* video moderation added by the addendum of
 * 2 September (brief §7.9.2): no video is visible to a recruiter or to the
 * public before an administrator has validated it, and every decision leaves a
 * trace naming who took it and when.
 */

export type VideoModerationAction = 'APPROVE' | 'REJECT';

/** One video waiting in the queue.
 *
 *  This is the one response that deliberately carries `url` for a video that is
 *  not published — an administrator cannot decide on a video without watching
 *  it. The route is guarded by `requireRole('ADMIN')`, and it is the only place
 *  a pending video's address is disclosed; the catalogue, the feed and the
 *  public profile all filter on APPROVED. */
export interface VideoModerationItem {
  id: string;
  title: string;
  description: string | null;
  url: string;
  durationSeconds: number | null;
  moderationStatus: ModerationStatus;
  submittedAt: string;
  applicant: {
    profileId: string;
    firstName: string;
    lastName: string;
    headline: string | null;
  };
  /** The decision that produced the current status, when there is one. */
  lastDecision: VideoModerationDecision | null;
}

export interface VideoModerationDecision {
  action: VideoModerationAction;
  /** Never optional. "A video that disappears without explanation is
   *  litigation starting" — the reason is shown back to the candidate. */
  reason: string;
  decidedAt: string;
  decidedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

/** Body of `POST /admin/videos/{videoId}/moderate`. */
export interface VideoModerationInput {
  action: VideoModerationAction;
  reason: string;
  notes?: string;
}

export const VIDEO_MODERATION_REASON_MIN_LENGTH = 10;
export const VIDEO_MODERATION_REASON_MAX_LENGTH = 500;

export const VIDEO_MODERATION_QUEUE_FILTERS = ['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const;
export type VideoModerationQueueFilter = (typeof VIDEO_MODERATION_QUEUE_FILTERS)[number];

export interface VideoModerationQuery {
  page?: number;
  limit?: number;
  status?: VideoModerationQueueFilter;
}
