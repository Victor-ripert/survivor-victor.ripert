import { env } from '../../config/env.js';
import type { VideoProvider, VideoProviderName } from '../video-provider.js';
import { createMinistryPlaceholderVideoProvider } from './ministry-placeholder.js';
import { createExternalLinkVideoProvider } from './external-link.js';
import { createLocalVideoProvider } from './local.js';

/** The one place a `VideoProviderName` becomes a live `VideoProvider`
 *  instance — both selectors below build on this rather than repeating the
 *  three-way switch. */
const createProvider = (name: VideoProviderName): VideoProvider => {
  switch (name) {
    case 'ministry-placeholder':
      return createMinistryPlaceholderVideoProvider();
    case 'external-link':
      return createExternalLinkVideoProvider();
    case 'local':
      return createLocalVideoProvider();
  }
};

/**
 * Resolves VIDEO_PROVIDER to the matching implementation for `type: UPLOAD`
 * video storage. This is the one place that decides which VideoProvider
 * backs *new* uploads — controllers and services import getVideoProvider(),
 * never a specific implementation directly, so the env var is the whole
 * switch (A6: flip it to 'ministry-placeholder', restart, degraded mode is
 * live).
 *
 * `EXTERNAL_LINK` videos (YouTube/Vimeo) are not switched by this: which
 * platform hosts a pasted link is a fact about that link, not a deployment
 * choice, so `video.service.ts#addExternalVideo` talks to
 * `createExternalLinkVideoProvider()` directly instead of going through this
 * selector. And deleting an *existing* video doesn't use this either — see
 * `getVideoProviderByName` below.
 */
export const getVideoProvider = (): VideoProvider => createProvider(env.VIDEO_PROVIDER);

/**
 * Resolves the provider a `Video` row was actually stored through
 * (`Video.providerName`, V2/V3), for the one caller — `deleteVideo` — that
 * must delete from wherever the bytes really are, not from whichever
 * provider `VIDEO_PROVIDER` names *today*. Those two can disagree the
 * moment the env var changes after a video was uploaded.
 *
 * Returns `null` for anything that isn't a real, known `VideoProviderName`:
 * `Video.providerName` is a plain string column, so a row that predates the
 * V2 migration (or one the V3 backfill hasn't reached yet) reads back as
 * `null` — the caller is expected to have its own fallback for that case,
 * this function just refuses to guess.
 */
export const getVideoProviderByName = (name: string | null): VideoProvider | null => {
  if (name === 'local' || name === 'ministry-placeholder' || name === 'external-link') {
    return createProvider(name);
  }
  return null;
};
