import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { prisma } from '../../src/config/prisma.js';
import {
  addExternalVideo,
  addUploadedVideo,
  deleteVideo,
} from '../../src/services/video.service.js';
import {
  createLocalVideoProvider,
  resolveUploadDir,
} from '../../src/services/video-providers/local.js';
import { buildVideoConsent } from '../../src/services/video-consent.js';

/**
 * Integration tests — hits a real database and, for the upload path, the
 * real local disk (see `moderation.service.test.ts` for why that's the
 * right call here rather than mocking). This is the proof that V1 actually
 * wired `addExternalVideo` / `addUploadedVideo` / `deleteVideo` through the
 * `VideoProvider` abstraction end-to-end, not just that the pure helper
 * functions still work in isolation.
 */
describe('video.service — provider wiring', () => {
  let applicantId: string;
  let profileId: string;

  beforeAll(async () => {
    const applicant = await prisma.user.create({
      data: {
        email: `applicant-${randomUUID()}@test.local`,
        passwordHash: 'not-a-real-hash',
        firstName: 'Applicant',
        lastName: 'Test',
        role: 'APPLICANT',
      },
    });
    applicantId = applicant.id;

    const profile = await prisma.profile.create({
      data: { userId: applicantId, location: 'Paris', sector: 'Informatique' },
    });
    profileId = profile.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: applicantId } });
    await prisma.$disconnect();
  });

  it('addExternalVideo stores the normalized embed URL via the external-link provider', async () => {
    const video = await addExternalVideo(profileId, applicantId, {
      title: 'Vidéo de présentation',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      consentAccepted: true,
    });

    expect(video.url).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');

    // providerRef/providerName aren't in the API DTO (toVideoDto doesn't
    // project them — they're internal bookkeeping, not in openapi.yaml's
    // Video schema), so read the raw row to check them.
    const row = await prisma.video.findUniqueOrThrow({ where: { id: video.id } });
    expect(row.providerName).toBe('external-link');
    // The external-link provider's ref *is* the normalized embed URL.
    expect(row.providerRef).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');

    await deleteVideo(video.id, applicantId);
  });

  it('addUploadedVideo writes real bytes to disk via the local provider, and deleteVideo removes them', async () => {
    // A synthetic MP4 header — detectVideoContentType only ever looks at the
    // first bytes, so this is all the local provider needs to accept it.
    const buffer = Buffer.concat([Buffer.alloc(4), Buffer.from('ftyp'), Buffer.from('isom')]);

    const video = await addUploadedVideo(
      profileId,
      applicantId,
      { title: 'Vidéo déposée', consentAccepted: true },
      { buffer },
    );

    expect(video.url.startsWith('/uploads/')).toBe(true);
    const absolutePath = path.join(resolveUploadDir(), path.basename(video.url));
    expect(existsSync(absolutePath)).toBe(true);

    const row = await prisma.video.findUniqueOrThrow({ where: { id: video.id } });
    expect(row.providerName).toBe('local');
    // The local provider's ref *is* the public URL — no separate identifier.
    expect(row.providerRef).toBe(video.url);

    await deleteVideo(video.id, applicantId);

    expect(existsSync(absolutePath)).toBe(false);
    await expect(prisma.video.findUnique({ where: { id: video.id } })).resolves.toBeNull();
  });

  it('deleteVideo still removes the file for a row that predates the V2 migration (providerName null)', async () => {
    // Bypasses addUploadedVideo on purpose, to reproduce exactly the row
    // shape V3's backfill is meant for: a real file on disk, but
    // providerRef/providerName never set (as if written before V2 landed,
    // and the V3 backfill script hasn't reached it yet).
    const provider = createLocalVideoProvider();
    const buffer = Buffer.concat([Buffer.alloc(4), Buffer.from('ftyp'), Buffer.from('isom')]);
    const ref = await provider.store({ kind: 'upload', buffer, contentType: 'video/mp4' });
    const url = await provider.playbackUrl(ref);
    const absolutePath = path.join(resolveUploadDir(), path.basename(url));
    expect(existsSync(absolutePath)).toBe(true);

    const video = await prisma.video.create({
      data: {
        profileId,
        title: 'Vidéo pré-V2',
        type: 'UPLOAD',
        url,
        // provider ref/name deliberately omitted — this is the legacy shape.
        ...buildVideoConsent(),
      },
    });
    expect(video.providerName).toBeNull();

    await deleteVideo(video.id, applicantId);

    expect(existsSync(absolutePath)).toBe(false);
    await expect(prisma.video.findUnique({ where: { id: video.id } })).resolves.toBeNull();
  });
});
