export const CONTACT_MESSAGE_MIN_LENGTH = 10;
export const CONTACT_MESSAGE_MAX_LENGTH = 2000;

/** A recruiter may send at most this many messages to the same applicant per
 *  rolling 24h window. The platform is a hiring channel, not an inbox to
 *  flood, and the cap is per applicant so it cannot be used to harass one
 *  person while staying under a global limit. */
export const CONTACT_LIMIT_PER_APPLICANT_PER_DAY = 5;
export const CONTACT_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Repeat views of the same profile within this window collapse onto the
 *  first one, so "profiles viewed" counts people rather than page loads. */
export const VIEW_DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

export const DASHBOARD_TREND_DAYS = 30;

export const CATALOGUE_SEARCH_MAX_LENGTH = 100;
export const CATALOGUE_MAX_SKILL_FILTERS = 10;
