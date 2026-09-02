export const CONSENT_TEXT_VERSION = 'v1.0';

/**
 * The exact wording a candidate accepts when publishing a video. Kept in the
 * shared package so the form shows, and the API logs, the same text — a
 * change here must bump `CONSENT_TEXT_VERSION`, since `Video.consentTextVersion`
 * records which version each candidate agreed to (brief §7.1).
 */
export const VIDEO_CONSENT_TEXT =
  "J'autorise ProfilsActifs à diffuser cette vidéo, qui contient mon image et ma voix, " +
  'aux recruteurs et au public une fois validée par la modération. Je peux retirer ce ' +
  'consentement à tout moment en supprimant la vidéo depuis mon espace.';
