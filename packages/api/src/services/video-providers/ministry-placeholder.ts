import { randomUUID } from 'node:crypto';
import type {
  VideoProvider,
  VideoProviderRef,
  VideoProviderStatus,
  StoreVideoInput,
} from '../video-provider.js';

/**
 * Stands in for the ministry's own PeerTube instance, not yet available
 * (Thomas: three months out). Conforms to VideoProvider so the rest of the
 * app can be wired against it today — behaviourally it is always degraded:
 * status() never reports 'ready', so A3's fallback UI is what a real user
 * sees for any video routed here, not a crash. Nothing is actually
 * persisted anywhere; this provider is non-functional by design, not by
 * accident.
 */
export const createMinistryPlaceholderVideoProvider = (): VideoProvider => ({
  name: 'ministry-placeholder',

  // Accepts the video rather than rejecting it outright: the ministry
  // instance existing later should not require replaying every submission
  // made while it didn't.
  async store(_input: StoreVideoInput): Promise<VideoProviderRef> {
    return `ministry-placeholder:${randomUUID()}`;
  },

  async status(_ref: VideoProviderRef): Promise<VideoProviderStatus> {
    return 'unavailable';
  },

  async playbackUrl(ref: VideoProviderRef): Promise<string> {
    throw new Error(
      `playbackUrl() called on ministry-placeholder ref "${ref}": this provider never reaches 'ready', check status() first.`,
    );
  },

  // Nothing was ever really stored — deletion is a no-op, and idempotent.
  async delete(_ref: VideoProviderRef): Promise<void> {},
});
