import { existsSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/config/prisma.js';
import { resolveUploadDir } from '../src/services/video-providers/local.js';
import { signToken } from '../src/services/jwt.js';

const app = createApp();

// 'ftyp' at offset 4, 'isom' major brand at offset 8 — the ISO base media
// container signature detectVideoContentType reads for an mp4.
const MP4_BYTES = Buffer.concat([Buffer.alloc(4), Buffer.from('ftyp'), Buffer.from('isom')]);

/**
 * `POST /profiles/:profileId/videos` with `type: 'UPLOAD'`, through the real
 * app: multer parsing the multipart body (`middleware/video-upload.ts`), the
 * route's auth gate, and `addUploadedVideo` writing to real disk. Nothing
 * else in the suite drives this route with an actual multipart request —
 * `test/services/video.service.test.ts` calls `addUploadedVideo` directly,
 * which proves the service and provider but not the HTTP layer in front of
 * them.
 */
describe('video upload — POST /profiles/:profileId/videos (type: UPLOAD)', () => {
  let applicantToken: string;
  let profileId: string;
  let recruiterToken: string;

  beforeAll(async () => {
    const applicant = await prisma.user.create({
      data: {
        email: `applicant-${randomUUID()}@test.local`,
        passwordHash: 'x',
        firstName: 'Amina',
        lastName: 'Test',
        role: 'APPLICANT',
        birthDate: new Date('1998-03-14'),
        profile: { create: { location: 'Lyon', sector: 'Informatique', headline: 'Dev' } },
      },
      include: { profile: true },
    });
    applicantToken = signToken({ id: applicant.id, email: applicant.email, role: 'APPLICANT' });
    profileId = applicant.profile!.id;

    const recruiter = await prisma.user.create({
      data: {
        email: `recruiter-${randomUUID()}@test.local`,
        passwordHash: 'x',
        firstName: 'Camille',
        lastName: 'Test',
        role: 'RECRUITER',
      },
    });
    recruiterToken = signToken({ id: recruiter.id, email: recruiter.email, role: 'RECRUITER' });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: '@test.local' } } });
    await prisma.$disconnect();
  });

  it('refuses an unauthenticated request before reading the body', async () => {
    const response = await request(app)
      .post(`/api/profiles/${profileId}/videos`)
      .field('type', 'UPLOAD')
      .field('title', 'Vidéo déposée')
      .field('consentAccepted', 'true')
      .attach('file', MP4_BYTES, { filename: 'clip.mp4', contentType: 'video/mp4' });

    expect(response.status).toBe(401);
  });

  it('keeps a recruiter from depositing a video', async () => {
    const response = await request(app)
      .post(`/api/profiles/${profileId}/videos`)
      .set('Authorization', `Bearer ${recruiterToken}`)
      .field('type', 'UPLOAD')
      .field('title', 'Vidéo déposée')
      .field('consentAccepted', 'true')
      .attach('file', MP4_BYTES, { filename: 'clip.mp4', contentType: 'video/mp4' });

    expect(response.status).toBe(403);
  });

  it('requires a file even when every other field is valid', async () => {
    const response = await request(app)
      .post(`/api/profiles/${profileId}/videos`)
      .set('Authorization', `Bearer ${applicantToken}`)
      .field('type', 'UPLOAD')
      .field('title', 'Vidéo déposée')
      .field('consentAccepted', 'true');

    expect(response.status).toBe(400);
  });

  it("refuses a file whose content isn't a recognized video format, by its bytes", async () => {
    const response = await request(app)
      .post(`/api/profiles/${profileId}/videos`)
      .set('Authorization', `Bearer ${applicantToken}`)
      .field('type', 'UPLOAD')
      .field('title', 'Vidéo déposée')
      .field('consentAccepted', 'true')
      // Named and declared as an mp4; the actual bytes are plain text — the
      // point of content-sniffing is that this still gets refused.
      .attach('file', Buffer.from('not actually a video'), {
        filename: 'clip.mp4',
        contentType: 'video/mp4',
      });

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({ error: 'unprocessable_entity' });
  });

  // multer's own limit is what actually bounds the request before it's fully
  // buffered — this is the one test that exercises it as a real HTTP request
  // rather than a unit test of assertUploadSizeWithinLimit or of
  // errorHandler in isolation (both already covered elsewhere).
  it('refuses a file over MAX_VIDEO_SIZE with 413, at the HTTP boundary', async () => {
    const oversized = Buffer.alloc(env.MAX_VIDEO_SIZE + 1);

    const response = await request(app)
      .post(`/api/profiles/${profileId}/videos`)
      .set('Authorization', `Bearer ${applicantToken}`)
      .field('type', 'UPLOAD')
      .field('title', 'Vidéo déposée')
      .field('consentAccepted', 'true')
      .attach('file', oversized, { filename: 'clip.mp4', contentType: 'video/mp4' });

    expect(response.status).toBe(413);
    expect(response.body).toMatchObject({ error: 'payload_too_large' });
  }, 30000);

  it('stores a real upload to disk and serves it back under /uploads/', async () => {
    const response = await request(app)
      .post(`/api/profiles/${profileId}/videos`)
      .set('Authorization', `Bearer ${applicantToken}`)
      .field('type', 'UPLOAD')
      .field('title', 'Vidéo déposée')
      .field('consentAccepted', 'true')
      .attach('file', MP4_BYTES, { filename: 'clip.mp4', contentType: 'video/mp4' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ type: 'UPLOAD', moderationStatus: 'PENDING' });
    expect(response.body.url.startsWith('/uploads/')).toBe(true);

    const absolutePath = path.join(resolveUploadDir(), path.basename(response.body.url));
    expect(existsSync(absolutePath)).toBe(true);

    const served = await request(app).get(response.body.url);
    expect(served.status).toBe(200);

    // Revoking consent removes both the row and the file — proven through
    // the real route, same as the upload itself.
    const deletion = await request(app)
      .delete(`/api/videos/${response.body.id}`)
      .set('Authorization', `Bearer ${applicantToken}`);
    expect(deletion.status).toBe(204);
    expect(existsSync(absolutePath)).toBe(false);
  });

  it('still accepts an EXTERNAL_LINK video as a JSON body on the same route', async () => {
    const response = await request(app)
      .post(`/api/profiles/${profileId}/videos`)
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({
        type: 'EXTERNAL_LINK',
        title: 'Vidéo de présentation',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        consentAccepted: true,
      });

    expect(response.status).toBe(201);
    expect(response.body.url).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');

    await request(app)
      .delete(`/api/videos/${response.body.id}`)
      .set('Authorization', `Bearer ${applicantToken}`);
  });
});
