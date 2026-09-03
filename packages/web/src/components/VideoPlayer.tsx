import { useState } from 'react';
import type { VideoType } from '@profils-actifs/shared';
import { isEmbeddableUrl, resolveUploadedVideoSrc, toPlayerSrc } from '../utils/embed.js';
import { formatDuration } from '../utils/format.js';
import { Icon } from './Icon.js';

export interface PlayableVideo {
  id: string;
  title: string;
  url: string;
  type?: VideoType;
  duration?: number | null;
}

interface VideoPlayerProps {
  video: PlayableVideo;
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
 * Click-to-load. Nothing from the video host is requested until the viewer
 * asks for it: no thumbnail, no player script — which also keeps a
 * third-party request from firing on a page load the viewer never consented
 * to. The poster is a real button, so the keyboard reaches it.
 */
export const VideoPlayer = ({ video, active, onActivate }: VideoPlayerProps) => {
  // A `<video>` reports a missing or undecodable file through an error event,
  // not by throwing: without this the reader gets a black rectangle and no
  // explanation of why nothing plays.
  const [hasFailed, setHasFailed] = useState(false);

  if (video.type === 'UPLOAD') {
    if (hasFailed) {
      return <p className="video-placeholder">Cette vidéo n’a pas pu être chargée.</p>;
    }

    return (
      <video
        className="video-frame"
        src={resolveUploadedVideoSrc(video.url)}
        controls
        preload="metadata"
        onError={() => setHasFailed(true)}
      >
        Votre navigateur ne prend pas en charge la lecture de cette vidéo.
      </video>
    );
  }

  if (!isEmbeddableUrl(video.url)) {
    return <p className="video-placeholder">Cette vidéo ne peut pas être affichée.</p>;
  }

  if (active) {
    return (
      <iframe
        className="video-frame"
        src={toPlayerSrc(video.url, { autoplay: true }) ?? undefined}
        title={video.title}
        sandbox={IFRAME_SANDBOX}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }

  return (
    <button
      type="button"
      className="video-poster"
      onClick={() => onActivate(video.id)}
      aria-label={`Lire « ${video.title} »`}
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
};
