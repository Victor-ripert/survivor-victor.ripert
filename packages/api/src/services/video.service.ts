import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

// ============================================================================
// Direct upload (#4b) — extends the above. Deliberately isolated: nothing
// in addExternalVideo/deleteVideo above depends on anything below this
// line, so this whole section can be deleted without touching the iframe
// path if the team decides iframe-only is enough for the demo.
//
// No `multer` dependency exists yet, so there's no HTTP route calling any
// of this. Everything here works from an already-fully-read `Buffer` —
// that's what a route built on `multer.memoryStorage()` would hand it —
// which is also *why* the classic "client disconnects mid-upload" failure
// mode doesn't apply at this layer: by the time this code runs, Express/
// multer has already finished receiving the whole request body. The
// interruption risk that *does* exist here is different: the file write
// and the database insert are two separate steps, and the process could
// fail between them. See `addUploadedVideo`'s comment for how that's
// handled.
// ============================================================================

const MAX_UPLOAD_SIZE_BYTES = Number(process.env.MAX_VIDEO_SIZE) || 100 * 1024 * 1024;

/**
 * Never trust a client-reported size (a `Content-Length` header or a
 * `multipart` field is just text the client sent — trivially wrong or
 * lied about). This checks the size of the `Buffer` Node actually
 * received, i.e. the real byte count, which is why it takes a `number`
 * derived from `buffer.length` rather than anything the client claims.
 */
export function assertUploadSizeWithinLimit(sizeBytes: number): void {
  if (sizeBytes > MAX_UPLOAD_SIZE_BYTES) {
    throw new ServiceError(
      413,
      'payload_too_large',
      `Video files can't exceed ${Math.floor(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024))}MB.`,
    );
  }
}

type VideoContentType = 'video/mp4' | 'video/webm' | 'video/quicktime';

const EXTENSION_BY_CONTENT_TYPE: Record<VideoContentType, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

/**
 * Identifies a video file by the actual bytes at the start of its
 * content — a "magic number" / signature check — never by its file
 * extension or the `Content-Type` the client's browser attached to the
 * upload, both of which are just labels the client chose and can set to
 * anything. Renaming `malware.exe` to `malware.mp4` changes the
 * extension; it doesn't change the first 12 bytes of the file.
 *
 * - MP4 and QuickTime (.mov) both use the ISO base media container
 *   format: the first box is usually `ftyp` at byte offset 4, followed
 *   by a 4-byte "major brand" — `qt  ` (with a trailing space) for
 *   QuickTime, various others (`isom`, `mp42`, ...) for MP4. This
 *   doesn't attempt to recognize every possible MP4 brand — it treats
 *   any recognized `ftyp` box as a real MP4 unless the brand is
 *   specifically QuickTime's; the goal is catching non-video files, not
 *   perfectly classifying every valid one.
 * - WebM is built on the Matroska/EBML container format, which always
 *   starts with the 4-byte EBML magic number `0x1A45DFA3` at the very
 *   start of the file.
 */
export function detectVideoContentType(buffer: Buffer): VideoContentType | null {
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    const majorBrand = buffer.subarray(8, 12).toString('ascii');
    return majorBrand.startsWith('qt') ? 'video/quicktime' : 'video/mp4';
  }

  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) {
    return 'video/webm';
  }

  return null;
}

/**
 * Repo root, computed from this file's own location rather than
 * `process.cwd()` — the working directory depends on *how* the process
 * was started (`npm run dev -w @profils-actifs/api` vs. `turbo run dev`
 * from the repo root give different answers), while a source file's own
 * position on disk doesn't change based on how it was launched.
 * `.../packages/api/src/services/video.service.ts` -> up 4 directories ->
 * the repo root.
 */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

/**
 * Refuses to proceed if `absoluteDir` is the repo root itself or nested
 * inside it — i.e. mixed in with git-tracked application code. This is
 * what actually *enforces* "uploaded files must not be served from the
 * same directory as the application code", rather than just documenting
 * it as a rule someone has to remember. `.env.example`'s `UPLOAD_DIR`
 * default points outside the repo specifically so this never fires with
 * an untouched `.env`.
 */
export function assertUploadDirOutsideAppCode(absoluteDir: string): void {
  const relativeToRepo = path.relative(REPO_ROOT, absoluteDir);
  const isInsideRepo = !relativeToRepo.startsWith('..') && !path.isAbsolute(relativeToRepo);

  if (isInsideRepo) {
    throw new Error(
      `UPLOAD_DIR ("${absoluteDir}") resolves inside this repository (${REPO_ROOT}). ` +
        'Point it at a directory outside the cloned repo — a sibling directory in ' +
        'development, or an absolute path on the host in production.',
    );
  }
}

function resolveUploadDir(): string {
  const configured = process.env.UPLOAD_DIR ?? '../profils-actifs-uploads';
  const absoluteDir = path.resolve(REPO_ROOT, configured);
  assertUploadDirOutsideAppCode(absoluteDir);
  return absoluteDir;
}

async function writeVideoFile(
  buffer: Buffer,
  contentType: VideoContentType,
): Promise<{ absolutePath: string; publicUrl: string }> {
  const uploadDir = resolveUploadDir();
  await mkdir(uploadDir, { recursive: true });

  // A random filename, never the client-supplied original name — building
  // a filesystem path out of client-controlled text is exactly how path
  // traversal / injection bugs happen, so that name simply never reaches
  // the filesystem at all.
  const filename = `${randomUUID()}.${EXTENSION_BY_CONTENT_TYPE[contentType]}`;
  const absolutePath = path.join(uploadDir, filename);

  await writeFile(absolutePath, buffer);

  // A route (issue #6) still needs to actually serve this back — e.g. an
  // `express.static` mount at `/uploads` pointing at `resolveUploadDir()`.
  // That's *why* this stores a URL path here rather than the absolute
  // filesystem path: the API should never leak its own server-side
  // directory layout to a client.
  return { absolutePath, publicUrl: `/uploads/${filename}` };
}

export type UploadVideoInput = Omit<AddVideoInput, 'type' | 'url'>;

export interface UploadedFile {
  buffer: Buffer;
}

/**
 * `POST /profiles/{profileId}/videos` when `type: 'UPLOAD'`. Same
 * ownership check as `addExternalVideo`, for the same reason.
 *
 * Order of operations, and why: the file is written to disk *first*, the
 * database row second. If the database insert then fails, the just-written
 * file is deleted (`unlink`) — a compensating rollback. The reverse order
 * (DB row first) was deliberately not chosen: a database row referencing a
 * file that was never written would show up as a broken, unplayable video
 * somewhere in the product. An orphaned file with no DB row, by contrast,
 * is invisible to the rest of the app — nothing links to it, it never
 * appears anywhere — and merely wastes disk space until a periodic cleanup
 * job removes it. Given a choice between "occasionally leaks a few MB of
 * disk" and "occasionally shows a broken video to a real user", this picks
 * the failure mode nobody sees. The one gap this doesn't cover: the
 * process crashing *during* the `unlink` rollback itself — at that point
 * the best this code can do is have tried, which is why the rollback is
 * best-effort (`.catch()`) rather than something that could itself throw
 * and mask the original database error.
 */
export async function addUploadedVideo(
  profileId: string,
  ownerId: string,
  input: UploadVideoInput,
  file: UploadedFile,
): Promise<Video> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { userId: true },
  });

  if (!profile || profile.userId !== ownerId) {
    throw new ServiceError(404, 'not_found', 'Profile not found');
  }

  assertUploadSizeWithinLimit(file.buffer.length);

  const contentType = detectVideoContentType(file.buffer);
  if (!contentType) {
    throw new ServiceError(
      422,
      'unprocessable_entity',
      'This file is not a recognized video format (mp4, webm, mov). Renaming a file ' +
        "to a video extension doesn't make it one.",
    );
  }

  const { absolutePath, publicUrl } = await writeVideoFile(file.buffer, contentType);

  try {
    const video = await prisma.video.create({
      data: {
        profileId,
        title: input.title,
        description: input.description,
        type: 'UPLOAD',
        url: publicUrl,
        duration: input.duration,
        fileSizeBytes: file.buffer.length,
      },
    });

    return toVideoDto(video);
  } catch (err) {
    await unlink(absolutePath).catch(() => {
      // Best-effort: the database error below is the one that matters to
      // the caller. If this also fails, the file is an orphan — cleaned up
      // later by an out-of-band sweep, not by retrying here.
    });
    throw err;
  }
}
