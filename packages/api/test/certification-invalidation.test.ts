import request from 'supertest';
import { createApp } from '../src/app.js';
import { signToken } from '../src/services/jwt.js';
import { prisma } from '../src/config/prisma.js';

const app = createApp();

const applicantId = 'test-applicant-invalidation';
const adminToken = signToken({
  id: 'test-admin-invalidation',
  email: 'admin-invalidation@test.local',
  role: 'ADMIN',
});
const applicantToken = signToken({
  id: applicantId,
  email: 'applicant-invalidation@test.local',
  role: 'APPLICANT',
});

let questionId: string;
let optionId: string;

beforeAll(async () => {
  await prisma.user.create({
    data: {
      id: applicantId,
      email: 'applicant-invalidation@test.local',
      passwordHash: 'x',
      firstName: 'T',
      lastName: 'I',
      role: 'APPLICANT',
    },
  });

  const question = await prisma.certificationQuestion.create({
    data: {
      order: 995,
      type: 'MULTIPLE_CHOICE',
      text: 'invalidation test question',
      weight: 1,
      maxPoints: 10,
      isActive: true,
      options: {
        create: [
          { text: 'A', points: 0, order: 1 },
          { text: 'B', points: 10, order: 2 },
        ],
      },
    },
    include: { options: true },
  });
  questionId = question.id;
  optionId = question.options[0]!.id;
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: applicantId } }); // cascades attempt/answers/notifications
  await prisma.certificationQuestion.delete({ where: { id: questionId } }); // cascades options
  await prisma.$disconnect();
});

describe('PATCH /admin/certification/questions/:id — invalidates in-progress attempts', () => {
  it('purges answers, marks the attempt ABANDONED, and notifies the candidate', async () => {
    const started = await request(app)
      .post('/api/certification/attempt')
      .set('Authorization', `Bearer ${applicantToken}`);
    expect(started.status).toBe(201);
    const attemptId = started.body.id;

    const answered = await request(app)
      .post(`/api/certification/attempt/${attemptId}/answer`)
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({ questionId, optionId });
    expect(answered.status).toBe(201);
    expect(await prisma.answer.count({ where: { attemptId } })).toBeGreaterThan(0);

    const patched = await request(app)
      .patch(`/api/admin/certification/questions/${questionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ text: 'texte mis à jour après édition' });
    expect(patched.status).toBe(200);

    const attempt = await prisma.certificationAttempt.findUniqueOrThrow({
      where: { id: attemptId },
    });
    expect(attempt.status).toBe('ABANDONED');
    expect(await prisma.answer.count({ where: { attemptId } })).toBe(0);

    const notifications = await prisma.notification.findMany({
      where: { userId: applicantId, type: 'CERTIFICATION_ATTEMPT_INVALIDATED' },
    });
    expect(notifications.length).toBeGreaterThan(0);
  });

  it('lets the candidate start a fresh attempt after invalidation', async () => {
    const resumed = await request(app)
      .post('/api/certification/attempt')
      .set('Authorization', `Bearer ${applicantToken}`);

    // 201: a new attempt, not a resume of the ABANDONED one — the invariant
    // "at most one IN_PROGRESS attempt" only ever counted the abandoned one
    // as closed, so this must create fresh, not reuse it.
    expect(resumed.status).toBe(201);
    expect(resumed.body.status).toBe('IN_PROGRESS');

    await prisma.certificationAttempt.delete({ where: { id: resumed.body.id } });
  });

  it('does not invalidate attempts when editing a question that stays inactive', async () => {
    const inactiveQuestion = await prisma.certificationQuestion.create({
      data: {
        order: 994,
        type: 'SHORT_TEXT',
        text: 'inactive',
        weight: 1,
        maxPoints: 5,
        isActive: false,
      },
    });

    const started = await request(app)
      .post('/api/certification/attempt')
      .set('Authorization', `Bearer ${applicantToken}`);
    expect(started.status).toBe(201);
    const attemptId = started.body.id;

    await request(app)
      .patch(`/api/admin/certification/questions/${inactiveQuestion.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ text: 'toujours inactive' });

    const attempt = await prisma.certificationAttempt.findUniqueOrThrow({
      where: { id: attemptId },
    });
    expect(attempt.status).toBe('IN_PROGRESS');

    await prisma.certificationAttempt.delete({ where: { id: attemptId } });
    await prisma.certificationQuestion.delete({ where: { id: inactiveQuestion.id } });
  });
});
