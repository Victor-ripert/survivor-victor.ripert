import type { JSX } from 'react';
import type { VideoType } from '@profils-actifs/shared';
import { getEnv } from '../utils/env.js';
import styles from './VideoEmbed.module.css';

export interface VideoEmbedProps {
  type: VideoType;
  url: string;
}

const DEFAULT_API_ORIGIN = 'http://localhost:3000';

/**
 * The origin (scheme + host + port) `Video.url` values of type `UPLOAD`
 * are relative to — e.g. `/uploads/<file>.mp4`, served by the API's
 * `express.static` mount (see `video.service.ts`'s `writeVideoFile`), not
 * by the web app itself. Read once from `VITE_API_URL` (already declared
 * in `.env.example`, e.g. `http://localhost:3000/api`) and reduced to just
 * its origin, since the `/uploads` mount sits outside the `/api` prefix.
 */
function getApiOrigin(): string {
  const configured = getEnv('VITE_API_URL', `${DEFAULT_API_ORIGIN}/api`);
  try {
    return new URL(configured).origin;
  } catch {
    return DEFAULT_API_ORIGIN;
  }
}

/**
 * Turns an `UPLOAD` video's stored `url` into one the browser can actually
 * load. Already-absolute URLs (e.g. in a future non-local file store) pass
 * through unchanged; a relative path gets the API's origin prepended.
 * Exported so it's independently unit-testable, the same way
 * `normalizeExternalVideoUrl` is on the API side — this is its
 * frontend-side counterpart, not a duplicate of the same logic.
 */
export function resolveUploadedVideoSrc(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `${getApiOrigin()}${url}`;
}

/**
 * Minimal permission set for the `EXTERNAL_LINK` iframe: enough for the
 * YouTube/Vimeo player to run its own script and go fullscreen
 * (`allow-scripts`, `allow-same-origin`, `allow-presentation`), plus
 * `allow-popups` so the player's own "watch on YouTube/Vimeo" link opens a
 * new tab instead of silently doing nothing. Deliberately excludes
 * `allow-top-navigation` and `allow-forms` — nothing this iframe shows
 * should be able to redirect or submit anything on this page's behalf.
 */
const IFRAME_SANDBOX = 'allow-scripts allow-same-origin allow-presentation allow-popups';

/**
 * Renders a video regardless of how it was added to a profile — a
 * YouTube/Vimeo embed (`EXTERNAL_LINK`) or a directly-hosted file
 * (`UPLOAD`). Takes only `{ type, url }`, nothing that assumes it's
 * showing "a profile's video" specifically (no `profileId`, no `title`),
 * so the same component works unmodified on the public profile page,
 * inside a feed card, and later in the admin moderation preview.
 *
 * Both branches render inline (an `<iframe>` or a native `<video>`) rather
 * than a link out to YouTube/the file — satisfies the brief's "preview
 * without leaving the page" requirement by construction, not by extra
 * logic.
 */
export function VideoEmbed({ type, url }: VideoEmbedProps): JSX.Element {
  if (type === 'UPLOAD') {
    return (
      <video className={styles.player} src={resolveUploadedVideoSrc(url)} controls preload="metadata">
        Votre navigateur ne prend pas en charge la lecture de cette vidéo.
      </video>
    );
  }

  return (
    <iframe
      className={styles.player}
      src={url}
      title="Vidéo de présentation"
      sandbox={IFRAME_SANDBOX}
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      loading="lazy"
    />
  );
}
