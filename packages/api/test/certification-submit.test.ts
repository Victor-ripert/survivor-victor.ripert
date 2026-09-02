import request from 'supertest';
import { createApp } from '../src/app.js';
import type { CertificationQuestion, CertificationOption } from '@prisma/client';
import { signToken } from '../src/services/jwt.js';
import { prisma } from '../src/config/prisma.js';

// The real application, so these exercise the same middleware chain the
// server runs — error mapping included — instead of a stand-in that can
// drift from it.
const app = createApp();

const applicantId = 'test-applicant-submit';
const applicantToken = signToken({
  id: applicantId,
  email: 'applicant-submit@test.local',
  role: 'APPLICANT',
});

beforeAll(async () => {
  await prisma.user.create({
    data: {
      id: applicantId,
      email: 'applicant-submit@test.local',
      passwordHash: 'x',
      firstName: 'T',
      lastName: 'S',
      role: 'APPLICANT',
    },
  });
  await prisma.profile.create({
    data: { userId: applicantId, location: 'Paris', sector: 'Tech' },
  });
});

beforeEach(async () => {
  // Each test creates its own attempt(s) — start from a clean slate so a
  // notification or leftover attempt from a previous test can't leak in.
  await prisma.notification.deleteMany({ where: { userId: applicantId } });
  await prisma.certificationAttempt.deleteMany({ where: { userId: applicantId } });
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: applicantId } }); // cascades attempt/answers/profile/notifications
  await prisma.$disconnect();
});

// Answers every currently-active question with its best possible answer.
// The weighted-ratio formula in scoreAttempt guarantees this totals exactly
// 100 regardless of how many active questions exist — no need to touch the
// real seeded questions to make this test deterministic.
const answerAllActiveQuestionsOptimally = async (attemptId: string) => {
  const questions: (CertificationQuestion & { options: CertificationOption[] })[] =
    await prisma.certificationQuestion.findMany({
      where: { isActive: true },
      include: { options: true },
    });

  for (const question of questions) {
    switch (question.type) {
      case 'MULTIPLE_CHOICE': {
        const best = question.options.reduce((a, b) => (b.points > a.points ? b : a));
        await prisma.answer.create({
          data: { attemptId, questionId: question.id, optionId: best.id },
        });
        break;
      }
      case 'CHECKBOX': {
        const positive = question.options.filter((o) => o.points > 0);
        await prisma.answer.createMany({
          data: positive.map((o) => ({ attemptId, questionId: question.id, optionId: o.id })),
        });
        break;
      }
      case 'LIKERT_SCALE': {
        await prisma.answer.create({
          data: { attemptId, questionId: question.id, numericAnswer: 5 },
        });
        break;
      }
      case 'SHORT_TEXT': {
        await prisma.answer.create({
          data: { attemptId, questionId: question.id, textAnswer: 'answered' },
        });
        break;
      }
    }
  }
};

describe('POST /certification/attempt/:attemptId/submit — auth & lifecycle', () => {
  it('returns 404 for an unknown attempt', async () => {
    const res = await request(app)
      .post('/api/certification/attempt/does-not-exist/submit')
      .set('Authorization', `Bearer ${applicantToken}`);
    expect(res.status).toBe(404);
  });

  it('rejects submitting an attempt that is not IN_PROGRESS', async () => {
    const attempt = await prisma.certificationAttempt.create({
      data: { userId: applicantId, status: 'COMPLETED', completedAt: new Date() },
    });

    const res = await request(app)
      .post(`/api/certification/attempt/${attempt.id}/submit`)
      .set('Authorization', `Bearer ${applicantToken}`);
    expect(res.status).toBe(409);

    await prisma.certificationAttempt.delete({ where: { id: attempt.id } });
  });
});

describe('POST /certification/attempt/:attemptId/submit — applicant without a profile', () => {
  const orphanId = 'test-applicant-submit-no-profile';
  const orphanToken = signToken({
    id: orphanId,
    email: 'applicant-submit-orphan@test.local',
    role: 'APPLICANT',
  });

  beforeAll(async () => {
    await prisma.user.create({
      data: {
        id: orphanId,
        email: 'applicant-submit-orphan@test.local',
        passwordHash: 'x',
        firstName: 'T',
        lastName: 'O',
        role: 'APPLICANT',
      },
    });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: orphanId } });
  });

  it('answers 409 and leaves the attempt open instead of a bare 404', async () => {
    const attempt = await prisma.certificationAttempt.create({ data: { userId: orphanId } });
    await answerAllActiveQuestionsOptimally(attempt.id);

    const res = await request(app)
      .post(`/api/certification/attempt/${attempt.id}/submit`)
      .set('Authorization', `Bearer ${orphanToken}`);

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ error: 'conflict' });

    // The whole submit is one transaction: a scored attempt must not survive
    // a write that could not land the badge on a profile.
    const unchanged = await prisma.certificationAttempt.findUniqueOrThrow({
      where: { id: attempt.id },
    });
    expect(unchanged.status).toBe('IN_PROGRESS');
    expect(unchanged.score).toBeNull();

    await prisma.certificationAttempt.delete({ where: { id: attempt.id } });
  });
});

describe('POST /certification/attempt/:attemptId/submit — scoring outcomes', () => {
  it('a perfect run scores 100, earns a badge, updates the profile, and notifies', async () => {
    const attempt = await prisma.certificationAttempt.create({ data: { userId: applicantId } });
    await answerAllActiveQuestionsOptimally(attempt.id);

    const res = await request(app)
      .post(`/api/certification/attempt/${attempt.id}/submit`)
      .set('Authorization', `Bearer ${applicantToken}`);

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(100);
    expect(res.body.attempt.status).toBe('COMPLETED');
    expect(res.body.badge.badgeIconUrl).not.toBeNull();

    const dbAttempt = await prisma.certificationAttempt.findUniqueOrThrow({
      where: { id: attempt.id },
    });
    expect(dbAttempt.status).toBe('COMPLETED');
    expect(dbAttempt.score).toBe(100);
    expect(dbAttempt.completedAt).not.toBeNull();

    const profile = await prisma.profile.findUniqueOrThrow({ where: { userId: applicantId } });
    expect(profile.certificationStatus).toBe('COMPLETED');
    expect(profile.certificationScore).toBe(100);
    expect(profile.certificationBadge).toBe(res.body.badge.name);

    const notifications = await prisma.notification.findMany({
      where: { userId: applicantId, type: 'CERTIFICATION_BADGE_EARNED' },
    });
    expect(notifications.length).toBeGreaterThan(0);
  });

  it('an unanswered attempt scores 0, earns no badge, and sends no notification', async () => {
    const attempt = await prisma.certificationAttempt.create({ data: { userId: applicantId } });

    const res = await request(app)
      .post(`/api/certification/attempt/${attempt.id}/submit`)
      .set('Authorization', `Bearer ${applicantToken}`);

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(0);
    expect(res.body.badge.badgeIconUrl).toBeNull();

    const profile = await prisma.profile.findUniqueOrThrow({ where: { userId: applicantId } });
    expect(profile.certificationStatus).toBe('REJECTED');
    expect(profile.certificationBadge).toBeNull();

    const notifications = await prisma.notification.findMany({
      where: { userId: applicantId, type: 'CERTIFICATION_BADGE_EARNED' },
    });
    expect(notifications).toHaveLength(0);
  });

  it('rejects a second submit on the same attempt (no re-scoring)', async () => {
    const attempt = await prisma.certificationAttempt.create({ data: { userId: applicantId } });
    await answerAllActiveQuestionsOptimally(attempt.id);

    const first = await request(app)
      .post(`/api/certification/attempt/${attempt.id}/submit`)
      .set('Authorization', `Bearer ${applicantToken}`);
    expect(first.status).toBe(200);

    const second = await request(app)
      .post(`/api/certification/attempt/${attempt.id}/submit`)
      .set('Authorization', `Bearer ${applicantToken}`);
    expect(second.status).toBe(409);
  });

  it('distributes pointsEarned across CHECKBOX answer rows without double counting', async () => {
    const checkboxQuestion = await prisma.certificationQuestion.findFirst({
      where: { type: 'CHECKBOX', isActive: true },
      include: { options: true },
    });
    if (!checkboxQuestion)
      throw new Error('seed must contain at least one active CHECKBOX question for this test');

    const attempt = await prisma.certificationAttempt.create({ data: { userId: applicantId } });
    const positive = checkboxQuestion.options.filter((o) => o.points > 0);
    await prisma.answer.createMany({
      data: positive.map((o) => ({
        attemptId: attempt.id,
        questionId: checkboxQuestion.id,
        optionId: o.id,
      })),
    });

    await request(app)
      .post(`/api/certification/attempt/${attempt.id}/submit`)
      .set('Authorization', `Bearer ${applicantToken}`);

    const rows = await prisma.answer.findMany({
      where: { attemptId: attempt.id, questionId: checkboxQuestion.id },
    });
    const sum = rows.reduce((total, row) => total + row.pointsEarned, 0);
    const expected = Math.min(
      positive.reduce((total, o) => total + o.points, 0),
      checkboxQuestion.maxPoints,
    );
    expect(sum).toBe(expected);
  });
});
