import { env } from '../../config/env.js';
import type { VideoProvider } from '../video-provider.js';
import { createMinistryPlaceholderVideoProvider } from './ministry-placeholder.js';
import { createExternalLinkVideoProvider } from './external-link.js';
import { createLocalVideoProvider } from './local.js';

/**
 * Resolves VIDEO_PROVIDER to the matching implementation for `type: UPLOAD`
 * video storage. This is the one place that decides which VideoProvider
 * backs uploads — controllers and services import getVideoProvider(), never
 * a specific implementation directly, so the env var is the whole switch
 * (A6: flip it to 'ministry-placeholder', restart, degraded mode is live).
 *
 * `EXTERNAL_LINK` videos (YouTube/Vimeo) are not switched by this: which
 * platform hosts a pasted link is a fact about that link, not a deployment
 * choice, so `video.service.ts#addExternalVideo` talks to
 * `createExternalLinkVideoProvider()` directly instead of going through this
 * selector.
 */
export const getVideoProvider = (): VideoProvider => {
  switch (env.VIDEO_PROVIDER) {
    case 'ministry-placeholder':
      return createMinistryPlaceholderVideoProvider();
    case 'external-link':
      return createExternalLinkVideoProvider();
    case 'local':
      return createLocalVideoProvider();
  }
};
