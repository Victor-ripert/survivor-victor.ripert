import { CONSENT_TEXT_VERSION } from '@profils-actifs/shared';

export interface VideoConsentFields {
  acceptedAt: Date;
  consentTextVersion: string;
}

// Called by the domain B video controller (POST /profiles/{id}/videos) and
// spread straight into the same prisma.video.create() call — consent is
// recorded atomically with the video itself, never as a follow-up write,
// so a video can never exist in the database without a logged consent.
export const buildVideoConsent = (acceptedAt: Date = new Date()): VideoConsentFields => ({
  acceptedAt,
  consentTextVersion: CONSENT_TEXT_VERSION,
});

// Revocation deliberately does not live here. It is `deleteVideo` in
// video.service.ts, reached by DELETE /videos/{videoId}, because withdrawing
// consent has to remove the stored bytes — the video file and its caption
// track — and not merely the row that points at them. Keeping a second
// revocation entry point in this module produced exactly the drift it was
// meant to avoid: it deleted the row only, nothing called it, and the
// documentation described it as the live path for a fortnight.
