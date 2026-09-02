import { getEnv } from './env.js';

/**
 * Video URLs come from job-seekers, so they are untrusted input, and the
 * viewer's browser renders them inside an authenticated page.
 *
 * Two things are checked, not one. The https scheme keeps a `javascript:` URL
 * out of the iframe, and the host allowlist keeps an attacker-controlled site
 * from being framed inside the application's own chrome, where it could stage
 * a convincing "session expirée" credential prompt. A video hosted anywhere
 * else is simply not embedded.
 */
const YOUTUBE_EMBED_HOSTS = new Set(['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com']);
const VIMEO_EMBED_HOSTS = new Set(['player.vimeo.com', 'vimeo.com']);

const ALLOWED_EMBED_HOSTS = new Set([...YOUTUBE_EMBED_HOSTS, ...VIMEO_EMBED_HOSTS]);

const parseHttpsUrl = (url: string): URL | null => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed : null;
  } catch {
    return null;
  }
};

export const isEmbeddableUrl = (url: string): boolean => {
  const parsed = parseHttpsUrl(url);
  return parsed !== null && ALLOWED_EMBED_HOSTS.has(parsed.hostname.toLowerCase());
};

export interface PlayerOptions {
  /** Start playing as soon as the frame loads — only ever for the one video
   *  the viewer just chose (brief §8.6: a single active player). */
  autoplay?: boolean;
}

/**
 * The address handed to the player, with the accessibility defaults every
 * embed gets: captions on (brief §7.5) and, for YouTube, the related-videos
 * strip off. Returns `null` for anything outside the allowlist, so a caller
 * never frames an address it has not vetted.
 */
export const toPlayerSrc = (
  url: string,
  { autoplay = false }: PlayerOptions = {},
): string | null => {
  const parsed = parseHttpsUrl(url);
  if (!parsed) return null;

  const host = parsed.hostname.toLowerCase();

  if (YOUTUBE_EMBED_HOSTS.has(host)) {
    parsed.searchParams.set('cc_load_policy', '1');
    parsed.searchParams.set('cc_lang_pref', 'fr');
    parsed.searchParams.set('rel', '0');
    if (autoplay) parsed.searchParams.set('autoplay', '1');
    return parsed.toString();
  }

  if (VIMEO_EMBED_HOSTS.has(host)) {
    parsed.searchParams.set('texttrack', 'fr');
    parsed.searchParams.set('dnt', '1');
    if (autoplay) parsed.searchParams.set('autoplay', '1');
    return parsed.toString();
  }

  return null;
};

const DEFAULT_API_ORIGIN = 'http://localhost:3000';

/** Origin an `UPLOAD` video's relative `/uploads/...` path resolves against:
 *  the API serves those files, outside its `/api` prefix. */
export const resolveUploadedVideoSrc = (url: string): string => {
  if (/^https?:\/\//i.test(url)) return url;

  let origin = DEFAULT_API_ORIGIN;
  try {
    origin = new URL(getEnv('VITE_API_URL', `${DEFAULT_API_ORIGIN}/api`)).origin;
  } catch {
    // Keep the default origin.
  }

  return `${origin}${url}`;
};
