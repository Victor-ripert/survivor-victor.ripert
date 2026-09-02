import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { signToken } from '../src/services/jwt.js';

/**
 * HTTP-level integration tests, driven through `supertest` directly
 * against the exported `app` — no real port bound (that's the whole
 * reason `app.ts` and `index.ts` are separate files). Requires a reachable
 * database, same as `moderation.service.test.ts`.
 */
describe('app', () => {
  let applicantId: string;
  let applicantToken: string;
  let adminToken: string;

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
    applicantToken = signToken({ id: applicant.id, email: applicant.email, role: 'APPLICANT' });

    const admin = await prisma.user.create({
      data: {
        email: `admin-${randomUUID()}@test.local`,
        passwordHash: 'not-a-real-hash',
        firstName: 'Admin',
        lastName: 'Test',
        role: 'ADMIN',
      },
    });
    adminToken = signToken({ id: admin.id, email: admin.email, role: 'ADMIN' });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: applicantId } }); // cascades the profile created below
    await prisma.user.deleteMany({ where: { email: { endsWith: '@test.local' } } });
    await prisma.$disconnect();
  });

  describe('GET /health', () => {
    it('reports a connected database', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: 'ok', database: 'connected' });
    });
  });

  describe('unknown routes', () => {
    it('returns the uniform 404 shape', async () => {
      const res = await request(app).get('/api/this-route-does-not-exist');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        error: 'not_found',
        message: 'Route not found',
        statusCode: 404,
      });
    });
  });

  describe('GET /api/profiles', () => {
    it('returns the paginated feed shape, publicly, with no token', async () => {
      const res = await request(app).get('/api/profiles');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination.page', 1);
      expect(res.body).toHaveProperty('pagination.limit', 20);
    });
  });

  describe('GET /api/profiles/:id', () => {
    it('returns 404 for a nonexistent profile', async () => {
      const res = await request(app).get('/api/profiles/does-not-exist');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('not_found');
    });
  });

  describe('auth gating', () => {
    it('rejects GET /api/profiles/me with no token (401)', async () => {
      const res = await request(app).get('/api/profiles/me');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('unauthorized');
    });

    it('rejects GET /api/admin/moderation/profiles with no token (401)', async () => {
      const res = await request(app).get('/api/admin/moderation/profiles');
      expect(res.status).toBe(401);
    });

    it('rejects GET /api/admin/moderation/profiles for a non-admin token (403)', async () => {
      const res = await request(app)
        .get('/api/admin/moderation/profiles')
        .set('Authorization', `Bearer ${applicantToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('forbidden');
    });

    it('allows GET /api/admin/moderation/profiles for an admin token (200)', async () => {
      const res = await request(app)
        .get('/api/admin/moderation/profiles')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });
  });

  describe('optionalAuth visibility, end-to-end', () => {
    it("lets the owner see their own not-yet-approved profile, but hides it from an anonymous request", async () => {
      const created = await request(app)
        .post('/api/profiles/me')
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({ location: 'Lyon', sector: 'Informatique' });

      expect(created.status).toBe(200);
      expect(created.body.moderationStatus).toBe('PENDING');
      const profileId = created.body.id as string;

      const asOwner = await request(app)
        .get(`/api/profiles/${profileId}`)
        .set('Authorization', `Bearer ${applicantToken}`);
      expect(asOwner.status).toBe(200);
      expect(asOwner.body.id).toBe(profileId);

      const asStranger = await request(app).get(`/api/profiles/${profileId}`);
      expect(asStranger.status).toBe(404);
    });
  });
});
