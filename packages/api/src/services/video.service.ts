import { VideoType } from '@prisma/client';
import type { Video } from '@profils-actifs/shared';
import { prisma } from '../config/prisma.js';
import { notFound, unprocessableEntity } from '../utils/http-error.js';
import { toVideoDto, videoDecisionInclude } from '../utils/mappers.js';
import type { AddVideoInput } from '../validators/video.js';
import { buildVideoConsent } from './video-consent.js';
import { createExternalLinkVideoProvider } from './video-providers/external-link.js';
import { assertUploadSizeWithinLimit, detectVideoContentType } from './video-providers/local.js';
import { getVideoProvider, getVideoProviderByName } from './video-providers/index.js';
import { isPublished, isPubliclyVisible } from './visibility.js';

const profileNotFound = () => notFound('Profil introuvable');
const videoNotFound = () => notFound('Vidéo introuvable');

/** Everything `addVideoSchema` accepts except `type`: this function only ever
 *  adds an `EXTERNAL_LINK`, and the controller is what dispatches on `type`. */
export type ExternalVideoInput = Omit<AddVideoInput, 'type'>;

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

  // Always the external-link provider, never getVideoProvider(): which
  // platform hosts a pasted link is a fact about the link itself, not the
  // VIDEO_PROVIDER deployment choice that governs uploads.
  const provider = createExternalLinkVideoProvider();
  const ref = await provider.store({ kind: 'external-link', url: input.url });

  const video = await prisma.video.create({
    data: {
      profileId,
      title: input.title,
      description: input.description || null,
      type: VideoType.EXTERNAL_LINK,
      url: await provider.playbackUrl(ref),
      duration: input.duration,
      providerRef: ref,
      providerName: provider.name,
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
    select: {
      type: true,
      url: true,
      captionsUrl: true,
      providerName: true,
      providerRef: true,
      profile: { select: { userId: true } },
    },
  });
  if (!video || video.profile.userId !== ownerId) throw videoNotFound();

  await prisma.video.delete({ where: { id: videoId } });

  if (video.type !== VideoType.UPLOAD) return;

  // Only UPLOAD videos are still gone by more than the DB row: an
  // EXTERNAL_LINK video's file, if any, lives on YouTube/Vimeo's own
  // infrastructure, untouched by revoking consent on this platform.
  //
  // Delete from the provider this row was actually stored through
  // (Video.providerName/providerRef, V2, backfilled for older rows by
  // packages/db/src/migrate-video-providers.ts) — never from whichever
  // provider VIDEO_PROVIDER names *today*, which can be a different one if
  // the env var changed since this video was uploaded. A null
  // providerName means the row predates that migration and the backfill
  // hasn't reached it yet; falling back to getVideoProvider() there keeps
  // today's (pre-V4) behavior for that row rather than refusing the
  // deletion outright — revocation must still take effect (brief §7.1)
  // even for a row the backfill hasn't caught up with.
  const isLegacyUpload = video.providerName === null;
  const isLocalUploadUrl = video.url.startsWith('/uploads/');
  const provider =
    getVideoProviderByName(video.providerName) ??
    (isLegacyUpload && isLocalUploadUrl ? getVideoProviderByName('local') : null) ??
    getVideoProvider();
  const ref = video.providerRef ?? video.url;

  if (isLegacyUpload) {
    console.warn(
      `[api] video ${videoId} has no providerName (predates the V2 migration, or its backfill hasn't reached it) — deleting via provider "${provider.name}"`,
    );
  }

  // The caption track carries the candidate's own words transcribed; it is
  // part of what consent covered, so it goes with the video rather than
  // outliving it in the storage directory.
  await provider.delete(ref);
  if (video.captionsUrl) await provider.delete(video.captionsUrl);
}

export type UploadVideoInput = Omit<AddVideoInput, 'type' | 'url'>;

export interface UploadedFile {
  buffer: Buffer;
}

/**
 * `POST /profiles/{profileId}/videos` with `type: 'UPLOAD'`, once a route
 * feeds it a multipart body. No route parses a multipart body yet (the
 * controller answers 501 for `type: UPLOAD`), so this works from an
 * already-fully-read `Buffer`.
 *
 * Content-sniffing happens here, before `store()`: the `VideoProvider`
 * interface's `kind: 'upload'` input carries an already-known `contentType`,
 * so it has to be determined by the caller, not inside the provider. The
 * provider is written first and the row second: a row pointing at nothing
 * would be a broken video on screen, whereas an orphaned stored file is
 * invisible until swept. If the insert fails the stored file is removed
 * again, best effort.
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

  const provider = getVideoProvider();
  const ref = await provider.store({ kind: 'upload', buffer: file.buffer, contentType });

  try {
    const video = await prisma.video.create({
      data: {
        profileId,
        title: input.title,
        description: input.description || null,
        type: VideoType.UPLOAD,
        url: await provider.playbackUrl(ref),
        duration: input.duration,
        fileSizeBytes: file.buffer.length,
        providerRef: ref,
        providerName: provider.name,
        ...buildVideoConsent(),
      },
    });

    return toVideoDto(video);
  } catch (error: unknown) {
    await provider.delete(ref);
    throw error;
  }
}
