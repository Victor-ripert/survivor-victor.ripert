import express from 'express';
import request from 'supertest';
import { certificationRouter, certificationAdminRouter } from '../src/routes/certification.js';
import { signToken } from '../src/services/jwt.js';
import { prisma } from '../src/config/prisma.js';

// Mirrors how these two routers are meant to be mounted once index.ts exists
// (see routes/certification.ts) — /certification is candidate-facing,
// /admin/certification/* is admin-only.
const app = express();
app.use(express.json());
app.use('/certification', certificationRouter);
app.use('/admin', certificationAdminRouter);

const adminToken = signToken({ id: 'test-admin', email: 'admin@test.local', role: 'ADMIN' });
const applicantToken = signToken({ id: 'test-applicant', email: 'applicant@test.local', role: 'APPLICANT' });

describe('GET /certification/questions (public)', () => {
  it('returns questions without exposing points/weight/maxPoints', async () => {
    const res = await request(app).get('/certification/questions');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    for (const question of res.body) {
      expect(question).not.toHaveProperty('weight');
      expect(question).not.toHaveProperty('maxPoints');
      expect(question).not.toHaveProperty('isActive');
      for (const option of question.options ?? []) {
        expect(option).not.toHaveProperty('points');
      }
    }
  });

  it('only returns active questions', async () => {
    const inactive = await prisma.certificationQuestion.create({
      data: { order: 999, type: 'SHORT_TEXT', text: 'inactive test question', weight: 1, maxPoints: 5, isActive: false },
    });

    const res = await request(app).get('/certification/questions');
    expect(res.body.some((q: { id: string }) => q.id === inactive.id)).toBe(false);

    await prisma.certificationQuestion.delete({ where: { id: inactive.id } });
  });
});

describe('GET /admin/certification/questions', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/admin/certification/questions');
    expect(res.status).toBe(401);
  });

  it('rejects non-admin roles', async () => {
    const res = await request(app)
      .get('/admin/certification/questions')
      .set('Authorization', `Bearer ${applicantToken}`);
    expect(res.status).toBe(403);
  });

  it('returns full detail including points for admins', async () => {
    const res = await request(app)
      .get('/admin/certification/questions')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const withOptions = res.body.find((q: { options: unknown[] }) => q.options.length > 0);
    expect(withOptions.options[0]).toHaveProperty('points');
  });
});

describe('POST /admin/certification/questions', () => {
  const createdIds: string[] = [];

  afterAll(async () => {
    await prisma.certificationQuestion.deleteMany({ where: { id: { in: createdIds } } });
  });

  it('creates a MULTIPLE_CHOICE question with its options', async () => {
    const res = await request(app)
      .post('/admin/certification/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        order: 998,
        type: 'MULTIPLE_CHOICE',
        text: 'test question - safe to delete',
        weight: 2,
        maxPoints: 10,
        options: [
          { text: 'option A', points: 0, order: 1 },
          { text: 'option B', points: 10, order: 2 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.options).toHaveLength(2);
    createdIds.push(res.body.id);
  });

  it('rejects a MULTIPLE_CHOICE question with fewer than 2 options', async () => {
    const res = await request(app)
      .post('/admin/certification/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        order: 997,
        type: 'MULTIPLE_CHOICE',
        text: 'invalid question',
        options: [{ text: 'only one option', points: 10, order: 1 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validation_error');
  });
});

describe('PATCH /admin/certification/questions/:id', () => {
  let questionId: string;

  beforeAll(async () => {
    const question = await prisma.certificationQuestion.create({
      data: { order: 996, type: 'LIKERT_SCALE', text: 'patch target', weight: 1, maxPoints: 10 },
    });
    questionId = question.id;
  });

  afterAll(async () => {
    await prisma.certificationQuestion.delete({ where: { id: questionId } });
  });

  it('updates the weight (pondération)', async () => {
    const res = await request(app)
      .patch(`/admin/certification/questions/${questionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ weight: 3 });

    expect(res.status).toBe(200);
    expect(res.body.weight).toBe(3);
  });

  it('returns 404 for an unknown question', async () => {
    const res = await request(app)
      .patch('/admin/certification/questions/does-not-exist')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ weight: 5 });

    expect(res.status).toBe(404);
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
