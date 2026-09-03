# Video consent revocation (AD-4)

Videos are embedded via iframe (YouTube/Vimeo), not uploaded — the platform never stores a video
file of its own. The "storage directory before/after revocation" proof requested for revocation
therefore does not apply as stated: there is no directory to diff, because there is no file to
begin with.

Revocation is instead implemented as deletion of the `Video` row itself: `revokeVideoConsent`
(`packages/api/src/services/video-consent.ts`) deletes the row and returns the revocation
timestamp for the API response and notification, without persisting it — once the row is gone,
there is no longer a place in the database to store it. The applicable proof is the database
state before revocation (row present) and after (row absent), not a timestamped field on a
deleted record.