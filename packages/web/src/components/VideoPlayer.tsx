import { useCallback, useState } from 'react';
import type { VideoProviderStatus, VideoType } from '@profils-actifs/shared';
import { isEmbeddableUrl, resolveUploadedVideoSrc, toPlayerSrc } from '../utils/embed.js';
import { formatDuration } from '../utils/format.js';
import { Icon } from './Icon.js';

export interface PlayableVideo {
  id: string;
  title: string;
  url: string;
  type?: VideoType;
  captionsUrl?: string;
  duration?: number | null;
}

interface VideoPlayerProps {
  video: PlayableVideo;
  /**
   * Provider-level readiness (`VideoProvider.status()`, A1/A3) — distinct
   * from `hasFailed` below, which is a *playback* failure on an already-
   * ready video. Defaults to 'ready' so every existing caller that doesn't
   * pass this yet (nothing calls the provider's status() today, pending
   * Victor's V2/V3 migration) keeps behaving exactly as before.
   */
  status?: VideoProviderStatus;
  /** Whether this is the one player currently loaded — the parent keeps a
   *  single active id so two streams never play at once (brief §8.6). */
  active: boolean;
  onActivate: (videoId: string) => void;
}

/**
 * Minimal permission set for the embed: enough for the YouTube/Vimeo player
 * to run its own script and go fullscreen, plus `allow-popups` for the
 * player's own "watch on…" link. Deliberately excludes `allow-top-navigation`
 * and `allow-forms`.
 */
const IFRAME_SANDBOX = 'allow-scripts allow-same-origin allow-presentation allow-popups';

/**
 * Click-to-load, for a hosted file as much as for an embed. Nothing is
 * requested until the viewer asks for it: no thumbnail, no player script, no
 * third-party request on a page load the viewer never consented to. The
 * poster is a real button, so the keyboard reaches it.
 *
 * Both kinds go through the same poster so `active` governs them alike — an
 * uploaded video that rendered straight away would play alongside whichever
 * embed the viewer had just started, which is the thing §8.6 forbids.
 */
export const VideoPlayer = ({ video, status = 'ready', active, onActivate }: VideoPlayerProps) => {
  // A `<video>` reports a missing or undecodable file through an error event,
  // not by throwing: without this the reader gets a black rectangle and no
  // explanation of why nothing plays.
  const [hasFailed, setHasFailed] = useState(false);

  /**
   * Activation replaces the poster button with the player, which unmounts the
   * element that had focus. Left alone the keyboard lands back on `<body>`
   * and the next Tab restarts from the top of the document — measured on the
   * public profile page, and a WCAG 2.4.3 failure. Focusing the player as it
   * mounts keeps the reader where they were, and is what they asked for by
   * activating it.
   *
   * A ref callback rather than an Effect: this has to run exactly when the
   * node appears, which is precisely when a ref callback fires.
   *
   * Declared before the status early-returns below, not after: React
   * requires every hook to run on every render in the same order, and a
   * hook placed after a conditional `return` would violate that the moment
   * status is 'processing' or 'unavailable'.
   */
  const focusOnMount = useCallback((node: HTMLElement | null) => {
    node?.focus();
  }, []);

  // Checked before the poster, not after a click: showing "press play" on a
  // video the provider hasn't got ready yet just moves the failure one step
  // later, instead of telling the reader what is actually happening now.
  if (status === 'processing') {
    return (
      <p className="video-placeholder" role="status">
        Cette vidéo est en cours de traitement — réessayez dans quelques instants.
      </p>
    );
  }

  if (status === 'unavailable') {
    return (
      <p className="video-placeholder" role="status">
        Cette vidéo est temporairement indisponible.
      </p>
    );
  }

  const isUpload = video.type === 'UPLOAD';

  if (!isUpload && !isEmbeddableUrl(video.url)) {
    return <p className="video-placeholder">Cette vidéo ne peut pas être affichée.</p>;
  }

  if (!active) {
    return (
      <button
        type="button"
        className="video-poster"
        onClick={() => onActivate(video.id)}
        aria-label={`Lire « ${video.title} »${video.captionsUrl ? ', sous-titrée' : ''}`}
      >
        <span className="video-poster__play" aria-hidden="true">
          <Icon name="play" size={22} />
        </span>
        <span className="video-poster__caption" aria-hidden="true">
          <span>{video.title}</span>
          {typeof video.duration === 'number' && <span>{formatDuration(video.duration)}</span>}
        </span>
      </button>
    );
  }

  if (isUpload) {
    if (hasFailed) {
      return <p className="video-placeholder">Cette vidéo n’a pas pu être chargée.</p>;
    }

    return (
      <video
        ref={focusOnMount}
        className="video-frame"
        src={resolveUploadedVideoSrc(video.url)}
        controls
        autoPlay
        preload="metadata"
        crossOrigin="anonymous"
        tabIndex={0}
        onError={() => setHasFailed(true)}
      >
        {video.captionsUrl && (
          <track
            kind="captions"
            srcLang="fr"
            label="Français"
            src={resolveUploadedVideoSrc(video.captionsUrl)}
            default
          />
        )}
        Votre navigateur ne prend pas en charge la lecture de cette vidéo.
      </video>
    );
  }

  return (
    <iframe
      ref={focusOnMount}
      className="video-frame"
      src={toPlayerSrc(video.url, { autoplay: true }) ?? undefined}
      title={video.title}
      sandbox={IFRAME_SANDBOX}
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      tabIndex={0}
    />
  );
};
