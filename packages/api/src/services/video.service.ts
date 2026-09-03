import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VideoType } from '@prisma/client';
import type { Video } from '@profils-actifs/shared';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import {
  badRequest,
  internalError,
  notFound,
  payloadTooLarge,
  unprocessableEntity,
} from '../utils/http-error.js';
import { toVideoDto, videoDecisionInclude } from '../utils/mappers.js';
import type { AddVideoInput } from '../validators/video.js';
import { buildVideoConsent } from './video-consent.js';
import { isPublished, isPubliclyVisible } from './visibility.js';

const profileNotFound = () => notFound('Profil introuvable');
const videoNotFound = () => notFound('Vidéo introuvable');

/** Everything `addVideoSchema` accepts except `type`: this function only ever
 *  adds an `EXTERNAL_LINK`, and the controller is what dispatches on `type`. */
export type ExternalVideoInput = Omit<AddVideoInput, 'type'>;

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
 * `GET /profiles/{profileId}/videos` — public, same visibility rule as the
 * profile page. An empty array covers "no such profile", "not visible to this
 * viewer" and "no video yet" alike, so a stranger cannot tell them apart.
 */
export async function listVideosForProfile(profileId: string, viewerId?: string): Promise<Video[]> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      userId: true,
      moderationStatus: true,
      user: { select: { isActive: true, birthDate: true } },
      videos: { orderBy: { createdAt: 'asc' }, include: videoDecisionInclude },
    },
  });
  if (!profile) return [];

  const isOwner = viewerId !== undefined && viewerId === profile.userId;
  if (isOwner) return profile.videos.map(toVideoDto);
  if (!isPubliclyVisible(profile)) return [];

  return profile.videos.filter(isPublished).map(toVideoDto);
}

/**
 * `POST /profiles/{profileId}/videos` with `type: 'EXTERNAL_LINK'`. The
 * profile id comes from the URL, so ownership is checked here rather than
 * trusted. A new video is `PENDING` by schema default: nothing is published
 * before an administrator approves it (brief §7.9.2).
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
  if (!profile || profile.userId !== ownerId) throw profileNotFound();

  const embedUrl = normalizeExternalVideoUrl(input.url);

  const video = await prisma.video.create({
    data: {
      profileId,
      title: input.title,
      description: input.description || null,
      type: VideoType.EXTERNAL_LINK,
      url: embedUrl,
      duration: input.duration,
      // Publishing is the consent act (brief §7.1): the timestamp and the
      // version of the accepted text are logged with the video, so a later
      // change to the wording never reinterprets what was agreed to.
      ...buildVideoConsent(),
    },
  });

  return toVideoDto(video);
}

/**
 * `DELETE /videos/{videoId}` — the candidate withdrawing consent. Ownership
 * flows `Video -> Profile -> User`. The row goes first, so the link stops
 * being served even if the file removal below fails; for an uploaded file
 * the bytes are then deleted too, which is what makes revocation real
 * (brief §7.1) rather than a hidden entry.
 */
export async function deleteVideo(videoId: string, ownerId: string): Promise<void> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { type: true, url: true, profile: { select: { userId: true } } },
  });
  if (!video || video.profile.userId !== ownerId) throw videoNotFound();

  await prisma.video.delete({ where: { id: videoId } });

  if (video.type === VideoType.UPLOAD) await removeUploadedFile(video.url);
}

// ============================================================================
// Direct upload — the size and content-type checks the brief's §8.5 requires.
// Deliberately isolated from the iframe path above. No route parses a
// multipart body yet (the controller answers 501 for `type: UPLOAD`), so this
// section works from an already-fully-read `Buffer`.
// ============================================================================

const BYTES_PER_MEGABYTE = 1024 * 1024;

/** Checks the real byte count Node received, never a client-reported size. */
export function assertUploadSizeWithinLimit(sizeBytes: number): void {
  if (sizeBytes > env.MAX_VIDEO_SIZE) {
    const megabytes = Math.floor(env.MAX_VIDEO_SIZE / BYTES_PER_MEGABYTE);
    throw payloadTooLarge(`Une vidéo ne peut pas dépasser ${megabytes} Mo`);
  }
}

type VideoContentType = 'video/mp4' | 'video/webm' | 'video/quicktime';

const EXTENSION_BY_CONTENT_TYPE: Record<VideoContentType, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

const EBML_MAGIC = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);

/**
 * Identifies a video by the bytes at the start of its content — never by its
 * extension or the client-supplied MIME type. MP4 and QuickTime share the ISO
 * base media container (`ftyp` at offset 4, then a brand — `qt` for
 * QuickTime); WebM is Matroska/EBML and always opens with the EBML magic.
 */
export function detectVideoContentType(buffer: Buffer): VideoContentType | null {
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    const majorBrand = buffer.subarray(8, 12).toString('ascii');
    return majorBrand.startsWith('qt') ? 'video/quicktime' : 'video/mp4';
  }

  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(EBML_MAGIC)) return 'video/webm';

  return null;
}

/** Repo root, from this file's own location: `process.cwd()` depends on how
 *  the process was started, a source file's position on disk does not. */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

/**
 * Refuses a directory that is the repo root or nested inside it — uploaded
 * files must never sit among git-tracked application code (brief §8.5).
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
  const absoluteDir = path.resolve(REPO_ROOT, env.UPLOAD_DIR);
  assertUploadDirOutsideAppCode(absoluteDir);
  return absoluteDir;
}

const UPLOAD_URL_PREFIX = '/uploads/';

/**
 * Best effort, and deliberately so: the database row is already gone by the
 * time this runs, so the video is unreachable either way and a leftover file
 * only wastes disk until an operator sweeps the directory. Reporting a failure
 * here would turn a deletion that did work into a 500 — including when
 * `UPLOAD_DIR` is misconfigured, which `resolveUploadDir` throws for.
 */
async function removeUploadedFile(url: string): Promise<void> {
  try {
    // Only the basename is ever joined to the upload directory, so a stored
    // URL can never point outside it.
    const absolutePath = path.join(resolveUploadDir(), path.basename(url));

    try {
      await unlink(absolutePath);
    } catch (error: unknown) {
      const isMissing = (error as NodeJS.ErrnoException).code === 'ENOENT';
      if (!isMissing) console.error('[api] uploaded file not removed', absolutePath, error);
    }
  } catch (error: unknown) {
    console.error('[api] upload directory unusable, file left in place', error);
  }
}

async function writeVideoFile(
  buffer: Buffer,
  contentType: VideoContentType,
): Promise<{ absolutePath: string; publicUrl: string }> {
  const uploadDir = resolveUploadDir();

  // A random filename, never the client-supplied one: building a filesystem
  // path out of client-controlled text is how path traversal happens.
  const filename = `${randomUUID()}.${EXTENSION_BY_CONTENT_TYPE[contentType]}`;
  const absolutePath = path.join(uploadDir, filename);

  try {
    await mkdir(uploadDir, { recursive: true });
    await writeFile(absolutePath, buffer);
  } catch (error: unknown) {
    // A full disk or an unwritable directory is an operator's problem, not the
    // candidate's: it is logged with the path that failed, and answered with a
    // message that does not hand out the server's directory layout.
    console.error('[api] could not store the uploaded video', absolutePath, error);
    throw internalError("La vidéo n'a pas pu être enregistrée");
  }

  return { absolutePath, publicUrl: `${UPLOAD_URL_PREFIX}${filename}` };
}

export type UploadVideoInput = Omit<AddVideoInput, 'type' | 'url'>;

export interface UploadedFile {
  buffer: Buffer;
}

/**
 * `POST /profiles/{profileId}/videos` with `type: 'UPLOAD'`, once a route
 * feeds it a multipart body. The file is written first and the row second: a
 * row pointing at a file that was never written would be a broken video on
 * screen, whereas an orphaned file is invisible until swept. If the insert
 * fails the file is removed again, best effort.
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
  if (!profile || profile.userId !== ownerId) throw profileNotFound();

  assertUploadSizeWithinLimit(file.buffer.length);

  const contentType = detectVideoContentType(file.buffer);
  if (!contentType) {
    throw unprocessableEntity(
      "Ce fichier n'est pas une vidéo reconnue (mp4, webm, mov) — renommer un fichier ne change pas son contenu",
    );
  }

  const { absolutePath, publicUrl } = await writeVideoFile(file.buffer, contentType);

  try {
    const video = await prisma.video.create({
      data: {
        profileId,
        title: input.title,
        description: input.description || null,
        type: VideoType.UPLOAD,
        url: publicUrl,
        duration: input.duration,
        fileSizeBytes: file.buffer.length,
        ...buildVideoConsent(),
      },
    });

    return toVideoDto(video);
  } catch (error: unknown) {
    await unlink(absolutePath).catch(() => undefined);
    throw error;
  }
}
