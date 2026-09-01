/**
 * Video URLs come from job-seekers, so they are untrusted input, and the
 * recruiter's browser renders them inside an authenticated page.
 *
 * Two things are checked, not one. The https scheme keeps a `javascript:` URL
 * out of the iframe, and the host allowlist keeps an attacker-controlled site
 * from being framed inside the application's own chrome, where it could stage
 * a convincing "session expirée" credential prompt. A video hosted anywhere
 * else is simply not embedded.
 */
const ALLOWED_EMBED_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'vimeo.com',
  'player.vimeo.com',
  'dailymotion.com',
  'www.dailymotion.com',
  'geo.dailymotion.com',
]);

export const isEmbeddableUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);

    return parsed.protocol === 'https:' && ALLOWED_EMBED_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
};
