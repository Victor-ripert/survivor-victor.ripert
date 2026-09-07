/**
 * Abstraction over "wherever video bytes or links actually live" — local
 * disk today (Victor's V1), a non-functional placeholder until the
 * ministry's PeerTube instance exists (A2), and YouTube/Vimeo as a third,
 * disabled-by-default option (A4). Everything above this line — consent,
 * revocation, controllers — talks to a VideoProvider, never to a filesystem
 * or an SDK directly: swapping the active provider is a config change, not
 * a rewrite, once PeerTube ships.
 */

export type VideoProviderName = 'local' | 'ministry-placeholder' | 'external-link';

/**
 * Never a filesystem path and never guessable from outside — callers only
 * ever hold this opaque string, returned once by store() and round-tripped
 * back into status()/playbackUrl()/delete(). What it actually encodes is a
 * private detail of each VideoProvider implementation.
 */
export type VideoProviderRef = string;

export type VideoContentType = 'video/mp4' | 'video/webm' | 'video/quicktime';

export type StoreVideoInput =
  | { kind: 'upload'; buffer: Buffer; contentType: VideoContentType }
  | { kind: 'external-link'; url: string };

/**
 * `ready`      — playbackUrl() will resolve.
 * `processing` — the provider accepted the video but it isn't playable yet
 *                (A3: the profile stays visible, the video shows a
 *                placeholder instead of failing).
 * `unavailable`— the provider cannot currently be reached. This is the
 *                degraded-mode case A3/A6 must render around, not an
 *                exception callers are meant to catch.
 */
export type VideoProviderStatus = 'ready' | 'processing' | 'unavailable';

export interface VideoProvider {
  readonly name: VideoProviderName;

  /** Persists the video with this provider and returns an opaque ref to it.
   *  Never throws for "the provider is degraded" — that surfaces through
   *  status(), so a temporary outage never turns into a failed upload for
   *  content the provider will in fact accept once reachable again. */
  store(input: StoreVideoInput): Promise<VideoProviderRef>;

  status(ref: VideoProviderRef): Promise<VideoProviderStatus>;

  /** Resolves only once status() would report 'ready'. Callers check status
   *  first rather than treating a thrown error here as "still processing". */
  playbackUrl(ref: VideoProviderRef): Promise<string>;

  /** Removes the video from this provider — for a real backend, the actual
   *  bytes, not just a database row. Shares its call site with consent
   *  revocation (brief §7.1): one path, not two that can drift apart. */
  delete(ref: VideoProviderRef): Promise<void>;
}
