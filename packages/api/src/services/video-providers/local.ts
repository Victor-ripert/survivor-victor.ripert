import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  assertUploadDirOutsideRepo,
  resolveUploadDir as resolveSharedUploadDir,
} from '@profils-actifs/shared/node';
import { env } from '../../config/env.js';
import { internalError, payloadTooLarge } from '../../utils/http-error.js';
import type {
  StoreVideoInput,
  VideoContentType,
  VideoProvider,
  VideoProviderRef,
  VideoProviderStatus,
} from '../video-provider.js';

/**
 * Local-disk VideoProvider (V1) — today's only functional backend for
 * `type: UPLOAD` video, and the slot `ministry-placeholder`/`external-link`
 * exist to be swapped into once PeerTube is available, without any caller
 * changing. A ref is always the public `/uploads/...` URL the file is
 * already served from (see `app.ts`'s static mount) — opaque to callers,
 * never a raw filesystem path.
 */

const BYTES_PER_MEGABYTE = 1024 * 1024;
const UPLOAD_URL_PREFIX = '/uploads/';
const EBML_MAGIC = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);

const EXTENSION_BY_CONTENT_TYPE: Record<VideoContentType, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

/**
 * Shared with `middleware/error-handler.ts`, which reports the same limit
 * when multer itself rejects a body for exceeding it — before the buffer
 * this function checks ever exists.
 */
export const uploadSizeLimitMessage = (): string =>
  `Une vidéo ne peut pas dépasser ${Math.floor(env.MAX_VIDEO_SIZE / BYTES_PER_MEGABYTE)} Mo`;

/**
 * Checks the real byte count Node received, never a client-reported size.
 * Applies regardless of which provider ends up storing the bytes, but lives
 * here because local disk is the only backend today that actually receives
 * a buffer to size-check.
 */
export function assertUploadSizeWithinLimit(sizeBytes: number): void {
  if (sizeBytes > env.MAX_VIDEO_SIZE) throw payloadTooLarge(uploadSizeLimitMessage());
}

/**
 * Identifies a video by the bytes at the start of its content — never by its
 * extension or the client-supplied MIME type. MP4 and QuickTime share the ISO
 * base media container (`ftyp` at offset 4, then a brand — `qt` for
 * QuickTime); WebM is Matroska/EBML and always opens with the EBML magic.
 *
 * Called by `video.service.ts` *before* `store()`: the `VideoProvider`
 * interface takes an already-known `contentType` as part of a `kind: 'upload'`
 * input, so sniffing has to happen at the call site, not inside the provider.
 */
export function detectVideoContentType(buffer: Buffer): VideoContentType | null {
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    const majorBrand = buffer.subarray(8, 12).toString('ascii');
    return majorBrand.startsWith('qt') ? 'video/quicktime' : 'video/mp4';
  }

  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(EBML_MAGIC)) return 'video/webm';

  return null;
}

/**
 * Refuses a directory that is the repo root or nested inside it — uploaded
 * files must never sit among git-tracked application code (brief §8.5). The
 * rule itself lives in `@profils-actifs/shared/node` because the seed writes
 * its demonstration fixture into the same directory and must not be allowed
 * to disagree about where that is.
 */
export function assertUploadDirOutsideAppCode(absoluteDir: string): void {
  assertUploadDirOutsideRepo(absoluteDir);
}

/**
 * Called once at boot by `app.ts` (to mount the static file server) as well
 * as by every `store()`/`delete()` below, so a bad `UPLOAD_DIR` stops the
 * server instead of being discovered the first time a candidate revokes
 * consent.
 */
export function resolveUploadDir(): string {
  return resolveSharedUploadDir(env.UPLOAD_DIR);
}

const refToAbsolutePath = (ref: VideoProviderRef): string =>
  // Only the basename is ever joined to the upload directory, so a ref can
  // never resolve outside it, whatever shape it happens to have.
  path.join(resolveUploadDir(), path.basename(ref));

export const createLocalVideoProvider = (): VideoProvider => ({
  name: 'local',

  async store(input: StoreVideoInput): Promise<VideoProviderRef> {
    if (input.kind !== 'upload') {
      throw new Error(
        `local provider received a "${input.kind}" input — only uploads can be stored here.`,
      );
    }

    const uploadDir = resolveUploadDir();
    // A random filename, never the client-supplied one: building a
    // filesystem path out of client-controlled text is how path traversal
    // happens.
    const filename = `${randomUUID()}.${EXTENSION_BY_CONTENT_TYPE[input.contentType]}`;
    const absolutePath = path.join(uploadDir, filename);

    try {
      await mkdir(uploadDir, { recursive: true });
      await writeFile(absolutePath, input.buffer);
    } catch (error: unknown) {
      // A full disk or an unwritable directory is an operator's problem, not
      // the candidate's: it is logged with the path that failed, and
      // answered with a message that does not hand out the server's
      // directory layout.
      console.error('[api] could not store the uploaded video', absolutePath, error);
      throw internalError("La vidéo n'a pas pu être enregistrée");
    }

    return `${UPLOAD_URL_PREFIX}${filename}`;
  },

  // Local writes are synchronous: by the time store() resolves, the file is
  // already fully on disk and servable.
  async status(_ref: VideoProviderRef): Promise<VideoProviderStatus> {
    return 'ready';
  },

  // The ref already *is* the public URL — nothing further to resolve.
  async playbackUrl(ref: VideoProviderRef): Promise<string> {
    return ref;
  },

  /**
   * Best effort, and deliberately so: by the time this runs the database row
   * pointing at the file is already gone, so the video is unreachable either
   * way and a leftover file only wastes disk until an operator sweeps the
   * directory. Reporting a failure here would turn a deletion that did work
   * into a 500 — including when `UPLOAD_DIR` is misconfigured, which
   * `resolveUploadDir` throws for.
   */
  async delete(ref: VideoProviderRef): Promise<void> {
    try {
      const absolutePath = refToAbsolutePath(ref);

      try {
        await unlink(absolutePath);
      } catch (error: unknown) {
        const isMissing = (error as NodeJS.ErrnoException).code === 'ENOENT';
        if (!isMissing) console.error('[api] uploaded file not removed', absolutePath, error);
      }
    } catch (error: unknown) {
      // Unreachable in a server that booted, since app.ts resolves the same
      // directory at startup. Kept as a net, and loud about what it means:
      // bytes the candidate asked us to delete are still on disk.
      console.error(
        '[api] upload directory unusable — REVOKED VIDEO FILE LEFT ON DISK, remove it by hand',
        error,
      );
    }
  },
});
