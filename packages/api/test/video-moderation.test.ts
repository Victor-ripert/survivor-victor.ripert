import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { signToken } from '../src/services/jwt.js';
import { buildVideoConsent } from '../src/services/video-consent.js';

const app = createApp();

/**
 * Brief §7.9.2, end to end: a deposited video waits in the queue, an
 * administrator decides with a recorded reason, the trace names who decided
 * and when, and the candidate reads the reason on their own profile.
 */
describe('video moderation', () => {
  let adminId: string;
  let adminToken: string;
  let applicantToken: string;
  let profileId: string;
  let videoId: string;

  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: {
        email: `admin-${randomUUID()}@test.local`,
        passwordHash: 'x',
        firstName: 'Awa',
        lastName: 'Modératrice',
        role: 'ADMIN',
      },
    });
    adminId = admin.id;
    adminToken = signToken({ id: admin.id, email: admin.email, role: 'ADMIN' });

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

    const video = await prisma.video.create({
      data: {
        profileId,
        title: 'Présentation',
        type: 'EXTERNAL_LINK',
        url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        ...buildVideoConsent(),
      },
    });
    videoId = video.id;
  });

  afterAll(async () => {
    await prisma.moderationLog.deleteMany({ where: { adminId } });
    await prisma.user.deleteMany({ where: { email: { endsWith: '@test.local' } } });
    await prisma.$disconnect();
  });

  it('keeps recruiters and job-seekers out of the queue', async () => {
    const anonymous = await request(app).get('/api/admin/moderation/videos');
    expect(anonymous.status).toBe(401);

    const asApplicant = await request(app)
      .get('/api/admin/moderation/videos')
      .set('Authorization', `Bearer ${applicantToken}`);
    expect(asApplicant.status).toBe(403);
  });

  it('lists the pending video with its applicant and no decision yet', async () => {
    const response = await request(app)
      .get('/api/admin/moderation/videos')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    const item = response.body.data.find((entry: { id: string }) => entry.id === videoId);
    expect(item).toMatchObject({
      moderationStatus: 'PENDING',
      applicant: { profileId, firstName: 'Amina', lastName: 'Test' },
      lastDecision: null,
    });
  });

  it('refuses a decision without a reason, in both directions', async () => {
    for (const action of ['APPROVE', 'REJECT']) {
      const response = await request(app)
        .post(`/api/admin/videos/${videoId}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action, reason: 'court' });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ error: 'validation_error' });
    }
  });

  it('answers 404 for an unknown video', async () => {
    const response = await request(app)
      .post('/api/admin/videos/does-not-exist/moderate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'REJECT', reason: 'Un motif suffisamment long' });

    expect(response.status).toBe(404);
  });

  it('rejects the video, records who decided and when, and tells the candidate why', async () => {
    const response = await request(app)
      .post(`/api/admin/videos/${videoId}/moderate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'REJECT', reason: 'Le visage du candidat n’apparaît pas' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: videoId,
      moderationStatus: 'REJECTED',
      lastDecision: {
        action: 'REJECT',
        reason: 'Le visage du candidat n’apparaît pas',
        decidedBy: { id: adminId, firstName: 'Awa', lastName: 'Modératrice' },
      },
    });
    expect(typeof response.body.lastDecision.decidedAt).toBe('string');

    const log = await prisma.moderationLog.findFirst({ where: { videoId } });
    expect(log).toMatchObject({ adminId, action: 'REJECT' });

    const own = await request(app)
      .get('/api/profiles/me')
      .set('Authorization', `Bearer ${applicantToken}`);
    expect(own.status).toBe(200);
    expect(own.body.videos[0]).toMatchObject({
      moderationStatus: 'REJECTED',
      moderationReason: 'Le visage du candidat n’apparaît pas',
    });
  });

  it('filters the queue by status', async () => {
    const rejected = await request(app)
      .get('/api/admin/moderation/videos?status=REJECTED')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(rejected.body.data.some((entry: { id: string }) => entry.id === videoId)).toBe(true);

    const pending = await request(app)
      .get('/api/admin/moderation/videos')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(pending.body.data.some((entry: { id: string }) => entry.id === videoId)).toBe(false);
  });

  it('approves the video and the decision replaces the previous one', async () => {
    const response = await request(app)
      .post(`/api/admin/videos/${videoId}/moderate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'APPROVE', reason: 'Conforme après nouvelle vidéo' });

    expect(response.status).toBe(200);
    expect(response.body.moderationStatus).toBe('APPROVED');
    expect(response.body.lastDecision.action).toBe('APPROVE');

    const own = await request(app)
      .get('/api/profiles/me')
      .set('Authorization', `Bearer ${applicantToken}`);
    expect(own.body.videos[0]).not.toHaveProperty('moderationReason');
  });
});
