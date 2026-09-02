import { CONSENT_TEXT_VERSION } from '@profils-actifs/shared';

export interface VideoConsentFields {
  acceptedAt: Date;
  consentTextVersion: string;
}

export const buildVideoConsent = (acceptedAt: Date = new Date()): VideoConsentFields => ({
  acceptedAt,
  consentTextVersion: CONSENT_TEXT_VERSION,
});