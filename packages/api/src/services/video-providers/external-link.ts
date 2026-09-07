import type {
  VideoProvider,
  VideoProviderRef,
  VideoProviderStatus,
  StoreVideoInput,
} from '../video-provider.js';
import { badRequest } from '../../utils/http-error.js';

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);

/**
 * Turns any YouTube/Vimeo URL a candidate might paste — a watch link, a
 * share link (`youtu.be/...`), a Shorts link, one that's already an embed
 * link — into the one canonical `.../embed/...` form, so the stored
 * `Video.url` is always directly usable as an `<iframe src>`.
 *
 * Hostnames are checked with an exact allowlist match against `URL.hostname`,
 * never a substring check on the raw string: `https://youtube.com.evil.example`
 * contains the text "youtube.com" without being YouTube.
 */
export function normalizeExternalVideoUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw badRequest("L'adresse de la vidéo n'est pas une URL valide");
  }

  const hostname = parsed.hostname.toLowerCase();

  if (YOUTUBE_HOSTS.has(hostname)) {
    const videoId = extractYoutubeId(parsed);
    if (!videoId) throw badRequest('Aucun identifiant de vidéo trouvé dans ce lien YouTube');
    return `https://www.youtube.com/embed/${videoId}`;
  }

  if (VIMEO_HOSTS.has(hostname)) {
    const videoId = extractVimeoId(parsed);
    if (!videoId) throw badRequest('Aucun identifiant de vidéo trouvé dans ce lien Vimeo');
    return `https://player.vimeo.com/video/${videoId}`;
  }

  throw badRequest('Seuls les liens YouTube et Vimeo sont acceptés');
}

function extractYoutubeId(url: URL): string | null {
  if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('/')[0] || null;

  const pathMatch = /^\/(embed|shorts)\/([^/]+)/.exec(url.pathname);
  if (pathMatch) return pathMatch[2] ?? null;

  if (url.pathname === '/watch') return url.searchParams.get('v');

  return null;
}

function extractVimeoId(url: URL): string | null {
  const segments = url.pathname.split('/').filter(Boolean);
  const id =
    url.hostname === 'player.vimeo.com' ? segments[segments.indexOf('video') + 1] : segments[0];

  // Vimeo ids are numeric — rejects vimeo.com/channels/staffpicks, where
  // "channels" would otherwise be mistaken for the id.
  return id && /^\d+$/.test(id) ? id : null;
}

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
