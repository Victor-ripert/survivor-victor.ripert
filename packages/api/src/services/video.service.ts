import { prisma } from '../config/prisma.js';
import type { AddVideoInput } from '../validators/video.js';
import { toVideoDto } from '../utils/mappers.js';
import { ServiceError } from '../utils/errors.js';
import type { Video } from '@profils-actifs/shared';

/**
 * `addExternalVideo`'s input never needs a `type` field the way the raw
 * validator output does — this function's whole purpose is "add an
 * EXTERNAL_LINK video", so `type` can't meaningfully be anything else here.
 * The controller (not yet built) is what reads `req.body.type` and decides
 * whether to call this function or the future direct-upload one (#4b);
 * each service function then has an input shape that only allows what it
 * actually handles, instead of a shared shape both have to defensively
 * re-check.
 */
export type ExternalVideoInput = Omit<AddVideoInput, 'type'>;

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);

/**
 * Turns any YouTube/Vimeo URL a candidate might paste — a watch link, a
 * share link (`youtu.be/...`), a Shorts link, one that's already an embed
 * link — into the one canonical `.../embed/...` form. Normalizing once
 * here, at write time, means the stored `Video.url` is always directly
 * usable as an `<iframe src>` — the frontend (issue #9's `VideoEmbed`)
 * never has to re-parse a raw YouTube/Vimeo URL itself.
 *
 * Hostnames are checked with an *exact* allowlist match against
 * `URL.hostname`, never a substring/`.includes()` check on the raw string.
 * A substring check is trivially bypassed — `https://evil.example/?u=youtube.com`
 * and `https://youtube.com.evil.example/watch` both *contain* the text
 * "youtube.com" without being YouTube. Parsing the URL and comparing the
 * actual hostname closes that off.
 *
 * Exported (rather than kept private) so it can be unit-tested on its own
 * — it's a pure function, no database involved — and so it can move to
 * `packages/shared` later without changing its signature, if some other
 * part of the app ever needs the same normalization.
 */
export function normalizeExternalVideoUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new ServiceError(400, 'validation_error', 'The video URL is not a valid URL.');
  }

  const hostname = parsed.hostname.toLowerCase();

  if (YOUTUBE_HOSTS.has(hostname)) {
    const videoId = extractYoutubeId(parsed);
    if (!videoId) {
      throw new ServiceError(
        400,
        'validation_error',
        "Couldn't find a video id in that YouTube URL.",
      );
    }
    return `https://www.youtube.com/embed/${videoId}`;
  }

  if (VIMEO_HOSTS.has(hostname)) {
    const videoId = extractVimeoId(parsed);
    if (!videoId) {
      throw new ServiceError(
        400,
        'validation_error',
        "Couldn't find a video id in that Vimeo URL.",
      );
    }
    return `https://player.vimeo.com/video/${videoId}`;
  }

  throw new ServiceError(
    400,
    'validation_error',
    'Only YouTube or Vimeo links are accepted for a video embed.',
  );
}

function extractYoutubeId(url: URL): string | null {
  if (url.hostname === 'youtu.be') {
    // youtu.be/VIDEO_ID
    return url.pathname.slice(1).split('/')[0] || null;
  }

  // /embed/VIDEO_ID or /shorts/VIDEO_ID
  const pathMatch = /^\/(embed|shorts)\/([^/]+)/.exec(url.pathname);
  if (pathMatch) {
    return pathMatch[2] ?? null;
  }

  // /watch?v=VIDEO_ID
  if (url.pathname === '/watch') {
    return url.searchParams.get('v');
  }

  return null;
}

function extractVimeoId(url: URL): string | null {
  const segments = url.pathname.split('/').filter(Boolean);

  // player.vimeo.com/video/VIDEO_ID
  const id =
    url.hostname === 'player.vimeo.com'
      ? segments[segments.indexOf('video') + 1]
      : segments[0]; // vimeo.com/VIDEO_ID (optionally /VIDEO_ID/privacy-hash after it)

  // Vimeo ids are numeric — rejects things like vimeo.com/channels/staffpicks,
  // where "channels" would otherwise be mistaken for the id.
  return id && /^\d+$/.test(id) ? id : null;
}

/**
 * `POST /profiles/{profileId}/videos` when `type: 'EXTERNAL_LINK'`.
 *
 * The issue describes this as `addExternalVideo(profileId, input)`, but
 * `profileId` is a URL path parameter — any authenticated user could pass
 * *any* profile's id, not just their own. `deleteVideo` below is explicitly
 * required to check ownership before acting; this function does the same
 * check for the same reason, which is why it takes an extra `ownerId`
 * parameter rather than matching the two-argument signature literally. A
 * non-owner gets the same 404 as a nonexistent profile — see the note on
 * `getProfileById` in `profile.service.ts` for why "not yours" and
 * "doesn't exist" deliberately look identical from the outside.
 *
 * `moderationStatus` isn't set in the `create` call — like
 * `Profile.moderationStatus`, `Video.moderationStatus` defaults to
 * `PENDING` at the schema level (`schema.prisma`'s `@default(PENDING)`),
 * so leaving it out *is* what satisfies "new videos default to PENDING".
 */
export async function addExternalVideo(
  profileId: string,
  ownerId: string,
  input: ExternalVideoInput,
): Promise<Video> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { userId: true },
  });

  if (!profile || profile.userId !== ownerId) {
    throw new ServiceError(404, 'not_found', 'Profile not found');
  }

  const embedUrl = normalizeExternalVideoUrl(input.url);

  const video = await prisma.video.create({
    data: {
      profileId,
      title: input.title,
      description: input.description,
      type: 'EXTERNAL_LINK',
      url: embedUrl,
      duration: input.duration,
    },
  });

  return toVideoDto(video);
}

/**
 * `DELETE /videos/{videoId}`. `ownerId` is checked against the video's
 * *profile's* owner (`Video` has no `userId` of its own — ownership always
 * flows through `Video -> Profile -> User`), not against the video row
 * directly.
 */
export async function deleteVideo(videoId: string, ownerId: string): Promise<void> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: { profile: { select: { userId: true } } },
  });

  if (!video || video.profile.userId !== ownerId) {
    throw new ServiceError(404, 'not_found', 'Video not found');
  }

  await prisma.video.delete({ where: { id: videoId } });
}
