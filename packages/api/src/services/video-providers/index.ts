import { env } from '../../config/env.js';
import type { VideoProvider } from '../video-provider.js';
import { createMinistryPlaceholderVideoProvider } from './ministry-placeholder.js';

/**
 * Resolves VIDEO_PROVIDER to the matching implementation. This is the one
 * place that decides which VideoProvider is active — controllers and
 * services import getVideoProvider(), never a specific implementation
 * directly, so the env var is the whole switch (A6: flip it to
 * 'ministry-placeholder', restart, degraded mode is live).
 *
 * 'local' and 'external-link' throw for now: V1 (Victor) and A4 land the
 * real implementations, each replacing one branch below rather than
 * reworking this selector.
 */
export const getVideoProvider = (): VideoProvider => {
  switch (env.VIDEO_PROVIDER) {
    case 'ministry-placeholder':
      return createMinistryPlaceholderVideoProvider();
    case 'local':
      throw new Error(
        "VIDEO_PROVIDER=local is not implemented yet — pending Victor's V1 (packages/api/src/services/video-providers/local.ts).",
      );
    case 'external-link':
      throw new Error(
        'VIDEO_PROVIDER=external-link is not implemented yet — pending A4 (YouTube/Vimeo provider).',
      );
  }
};