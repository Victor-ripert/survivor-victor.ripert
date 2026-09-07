import type {
  VideoProvider,
  VideoProviderRef,
  VideoProviderStatus,
  StoreVideoInput,
} from '../video-provider.js';
import { normalizeExternalVideoUrl } from '../video.service.js';

/**
 * YouTube/Vimeo, wrapped behind VideoProvider. Disabled by default
 * (VIDEO_PROVIDER=local) — A4 exists so the interface has proven itself
 * against a real third backend, not because this is meant to be the active
 * provider yet.
 *
 * There is no upload step and nothing ProfilsActifs hosts: the embed URL
 * itself is stable, public and immediately playable, so it doubles as this
 * provider's ref rather than pointing at a separate private record —
 * "opaque" means callers must not assume a ref's shape, not that every
 * provider has to manufacture one.
 */
export const createExternalLinkVideoProvider = (): VideoProvider => ({
  name: 'external-link',

  async store(input: StoreVideoInput): Promise<VideoProviderRef> {
    if (input.kind !== 'external-link') {
      throw new Error(
        `external-link provider received a "${input.kind}" input — only external links can be stored here.`,
      );
    }

    // Throws badRequest for anything that isn't a recognised YouTube/Vimeo
    // URL; the normalized embed URL is itself the ref this provider hands
    // back.
    return normalizeExternalVideoUrl(input.url);
  },

  // No upload, no processing step to wait out — the platforms this wraps
  // either already serve the video or the link never normalized in store().
  async status(_ref: VideoProviderRef): Promise<VideoProviderStatus> {
    return 'ready';
  },

  async playbackUrl(ref: VideoProviderRef): Promise<string> {
    return ref;
  },

  // Nothing hosted here for ProfilsActifs to remove — the file, if any,
  // stays on YouTube/Vimeo under the candidate's own account, unaffected by
  // revoking consent on this platform (docs/legal/video-consent-revocation.md).
  async delete(_ref: VideoProviderRef): Promise<void> {},
});
