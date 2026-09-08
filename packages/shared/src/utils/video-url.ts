const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);

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
 * Turns any YouTube/Vimeo URL a candidate might paste — a watch link, a
 * share link (`youtu.be/...`), a Shorts link, one that's already an embed
 * link — into the one canonical `.../embed/...` form, so a stored
 * `Video.url` is always directly usable as an `<iframe src>`.
 *
 * Hostnames are checked with an exact allowlist match against `URL.hostname`,
 * never a substring check on the raw string: `https://youtube.com.evil.example`
 * contains the text "youtube.com" without being YouTube.
 *
 * Lives in `@profils-actifs/shared` rather than in `packages/api` because it
 * has exactly one call site per consumer: the video service (`POST
 * /profiles/{id}/videos`, wrapping the thrown `Error` in an `HttpError`) and
 * the db package's seed script (populating `Video.url`/`providerRef` with
 * the same normalization real recruiter-facing videos get, rather than
 * inserting a raw or hand-normalized URL directly). Throws a plain `Error`
 * — this module is HTTP-status-agnostic by design, so it stays usable from
 * both a request handler and a one-shot script.
 */
export function normalizeExternalVideoUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("L'adresse de la vidéo n'est pas une URL valide");
  }

  const hostname = parsed.hostname.toLowerCase();

  if (YOUTUBE_HOSTS.has(hostname)) {
    const videoId = extractYoutubeId(parsed);
    if (!videoId) throw new Error('Aucun identifiant de vidéo trouvé dans ce lien YouTube');
    return `https://www.youtube.com/embed/${videoId}`;
  }

  if (VIMEO_HOSTS.has(hostname)) {
    const videoId = extractVimeoId(parsed);
    if (!videoId) throw new Error('Aucun identifiant de vidéo trouvé dans ce lien Vimeo');
    return `https://player.vimeo.com/video/${videoId}`;
  }

  throw new Error('Seuls les liens YouTube et Vimeo sont acceptés');
}
