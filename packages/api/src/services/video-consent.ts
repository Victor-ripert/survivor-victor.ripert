import { prisma } from '../config/prisma.js';
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

export interface VideoRevocation {
  id: string;
  revokedAt: Date;
}

// Called by the domain B video controller (DELETE /videos/{id}). Embed
// videos have no underlying file, so revocation with real effect means the
// row itself is removed — there is no storage directory to diff before and
// after (see docs/legal/video-consent-revocation.md). revokedAt is
// returned for the response/notification only: once the row is gone there
// is nowhere left in the database to persist it.
export const revokeVideoConsent = async (videoId: string): Promise<VideoRevocation> => {
  const revokedAt = new Date();

  await prisma.video.delete({ where: { id: videoId } });

  return { id: videoId, revokedAt };
};