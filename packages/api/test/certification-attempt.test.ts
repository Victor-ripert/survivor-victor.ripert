import express from 'express';
import request from 'supertest';
import { certificationRouter, certificationAdminRouter } from '../src/routes/certification.js';
import { signToken } from '../src/services/jwt.js';
import { prisma } from '../src/config/prisma.js';

const app = express();
app.use(express.json());
app.use('/certification', certificationRouter);
app.use('/admin', certificationAdminRouter);

// CertificationAttempt.userId is a real FK to User, so these need matching
// rows in the DB — not just a JWT with a made-up id.
const applicantId = 'test-applicant-attempt';
const otherApplicantId = 'test-applicant-attempt-2';
const recruiterId = 'test-recruiter-attempt';

const applicantToken = signToken({ id: applicantId, email: 'applicant-attempt@test.local', role: 'APPLICANT' });
const otherApplicantToken = signToken({ id: otherApplicantId, email: 'other-attempt@test.local', role: 'APPLICANT' });
const recruiterToken = signToken({ id: recruiterId, email: 'recruiter-attempt@test.local', role: 'RECRUITER' });

beforeAll(async () => {
  await prisma.user.createMany({
    data: [
      { id: applicantId, email: 'applicant-attempt@test.local', passwordHash: 'x', firstName: 'T', lastName: 'A', role: 'APPLICANT' },
      { id: otherApplicantId, email: 'other-attempt@test.local', passwordHash: 'x', firstName: 'T', lastName: 'B', role: 'APPLICANT' },
      { id: recruiterId, email: 'recruiter-attempt@test.local', passwordHash: 'x', firstName: 'T', lastName: 'C', role: 'RECRUITER' },
    ],
    skipDuplicates: true,
  });
});

afterEach(async () => {
  await prisma.certificationAttempt.deleteMany({ where: { userId: { in: [applicantId, otherApplicantId] } } });
});

afterAll(async () => {
  // Cascades any leftover CertificationAttempt rows too.
  await prisma.user.deleteMany({ where: { id: { in: [applicantId, otherApplicantId, recruiterId] } } });
  await prisma.$disconnect();
});

describe('POST /certification/attempt', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).post('/certification/attempt');
    expect(res.status).toBe(401);
  });

  it('rejects non-applicant roles', async () => {
    const res = await request(app).post('/certification/attempt').set('Authorization', `Bearer ${recruiterToken}`);
    expect(res.status).toBe(403);
  });

  it('creates a new attempt on first call (201)', async () => {
    const res = await request(app).post('/certification/attempt').set('Authorization', `Bearer ${applicantToken}`);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('IN_PROGRESS');
    expect(res.body.userId).toBe(applicantId);
  });

  it('resumes the same attempt on a second call (200, same id)', async () => {
    const first = await request(app).post('/certification/attempt').set('Authorization', `Bearer ${applicantToken}`);
    const second = await request(app).post('/certification/attempt').set('Authorization', `Bearer ${applicantToken}`);

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);

    const count = await prisma.certificationAttempt.count({ where: { userId: applicantId, status: 'IN_PROGRESS' } });
    expect(count).toBe(1);
  });

  it('never creates two IN_PROGRESS attempts under concurrent requests', async () => {
    const [first, second] = await Promise.all([
      request(app).post('/certification/attempt').set('Authorization', `Bearer ${applicantToken}`),
      request(app).post('/certification/attempt').set('Authorization', `Bearer ${applicantToken}`),
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 201]);
    expect(first.body.id).toBe(second.body.id);

    const count = await prisma.certificationAttempt.count({ where: { userId: applicantId, status: 'IN_PROGRESS' } });
    expect(count).toBe(1);
  });
});

describe('GET /certification/attempt/:attemptId', () => {
  it('returns 404 for an unknown attempt', async () => {
    const res = await request(app)
      .get('/certification/attempt/does-not-exist')
      .set('Authorization', `Bearer ${applicantToken}`);
    expect(res.status).toBe(404);
  });

  it('returns 403 when the attempt belongs to someone else', async () => {
    const created = await request(app).post('/certification/attempt').set('Authorization', `Bearer ${applicantToken}`);

    const res = await request(app)
      .get(`/certification/attempt/${created.body.id}`)
      .set('Authorization', `Bearer ${otherApplicantToken}`);
    expect(res.status).toBe(403);
  });

  it('returns the attempt with no pointsEarned on answers while IN_PROGRESS', async () => {
    const created = await request(app).post('/certification/attempt').set('Authorization', `Bearer ${applicantToken}`);

    const res = await request(app)
      .get(`/certification/attempt/${created.body.id}`)
      .set('Authorization', `Bearer ${applicantToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
    for (const answer of res.body.answers) {
      expect(answer).not.toHaveProperty('pointsEarned');
    }
  });
});
