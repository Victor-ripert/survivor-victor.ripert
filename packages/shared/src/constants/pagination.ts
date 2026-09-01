// Single source of truth for the feed's page-size cap (brief: "20 profiles max per page").
// Both the API's validators and the web feed hook read these instead of hardcoding 20 —
// change the limit here once and it applies everywhere.
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 20;
