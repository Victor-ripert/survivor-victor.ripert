import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { signToken } from '../src/services/jwt.js';
import { buildVideoConsent } from '../src/services/video-consent.js';

const app = createApp();

const yearsAgo = (years: number): Date => {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date;
};

interface Fixture {
  userId: string;
  profileId: string;
  token: string;
}

const createApplicant = async (birthDate: Date, moderationStatus: 'APPROVED' | 'PENDING') => {
  const user = await prisma.user.create({
    data: {
      email: `applicant-${randomUUID()}@test.local`,
      passwordHash: 'x',
      firstName: 'Test',
      lastName: 'Visibilité',
      role: 'APPLICANT',
      birthDate,
      profile: { create: { location: 'Nantes', sector: 'Restauration', moderationStatus } },
    },
    include: { profile: true },
  });

  return {
    userId: user.id,
    profileId: user.profile!.id,
    token: signToken({ id: user.id, email: user.email, role: 'APPLICANT' }),
  } satisfies Fixture;
};

/**
 * What the public may see (brief §7.9.1 and §7.9.2): approved adult profiles,
 * with approved videos only. Everything else is invisible without being
 * distinguishable from "does not exist".
 */
describe('public visibility', () => {
  let adult: Fixture;
  let minor: Fixture;
  let pendingVideoId: string;
  let approvedVideoId: string;

  beforeAll(async () => {
    adult = await createApplicant(yearsAgo(30), 'APPROVED');
    minor = await createApplicant(yearsAgo(17), 'APPROVED');

    const pending = await prisma.video.create({
      data: {
        profileId: adult.profileId,
        title: 'En attente',
        type: 'EXTERNAL_LINK',
        url: 'https://www.youtube.com/embed/pending00000',
        ...buildVideoConsent(),
      },
    });
    pendingVideoId = pending.id;

    const approved = await prisma.video.create({
      data: {
        profileId: adult.profileId,
        title: 'Validée',
        type: 'EXTERNAL_LINK',
        url: 'https://www.youtube.com/embed/approved0000',
        moderationStatus: 'APPROVED',
        ...buildVideoConsent(),
      },
    });
    approvedVideoId = approved.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [adult.userId, minor.userId] } } });
    await prisma.$disconnect();
  });

  it('lists the adult on the public feed and keeps the minor off it', async () => {
    const response = await request(app).get('/api/profiles?limit=20');
    expect(response.status).toBe(200);

    const ids = response.body.data.map((profile: { id: string }) => profile.id);
    expect(ids).toContain(adult.profileId);
    expect(ids).not.toContain(minor.profileId);
  });

  it('serves only approved videos on the public feed and profile page', async () => {
    const feed = await request(app).get('/api/profiles?limit=20');
    const profile = feed.body.data.find((entry: { id: string }) => entry.id === adult.profileId);
    expect(profile.videos.map((video: { id: string }) => video.id)).toEqual([approvedVideoId]);

    const page = await request(app).get(`/api/profiles/${adult.profileId}`);
    expect(page.status).toBe(200);
    expect(page.body.videos.map((video: { id: string }) => video.id)).toEqual([approvedVideoId]);

    const videos = await request(app).get(`/api/profiles/${adult.profileId}/videos`);
    expect(videos.body.map((video: { id: string }) => video.id)).toEqual([approvedVideoId]);
  });

  it('shows the owner every video, pending ones included', async () => {
    const own = await request(app)
      .get('/api/profiles/me')
      .set('Authorization', `Bearer ${adult.token}`);
    const ids = own.body.videos.map((video: { id: string }) => video.id);
    expect(ids).toEqual(expect.arrayContaining([pendingVideoId, approvedVideoId]));

    const asOwner = await request(app)
      .get(`/api/profiles/${adult.profileId}`)
      .set('Authorization', `Bearer ${adult.token}`);
    expect(asOwner.body.videos).toHaveLength(2);
  });

  it("answers 404 for a minor's public profile page, but lets the minor see it", async () => {
    const asStranger = await request(app).get(`/api/profiles/${minor.profileId}`);
    expect(asStranger.status).toBe(404);

    const asOwner = await request(app)
      .get(`/api/profiles/${minor.profileId}`)
      .set('Authorization', `Bearer ${minor.token}`);
    expect(asOwner.status).toBe(200);

    const videos = await request(app).get(`/api/profiles/${minor.profileId}/videos`);
    expect(videos.body).toEqual([]);
  });

  it('answers a clean empty page beyond the last one', async () => {
    const response = await request(app).get('/api/profiles?page=9999');
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.pagination.page).toBe(9999);
  });

  it('caps the page size at 20 whatever is requested', async () => {
    const response = await request(app).get('/api/profiles?limit=500');
    expect(response.status).toBe(200);
    expect(response.body.pagination.limit).toBe(20);
  });
});
