import request from 'supertest';
import { createApp } from '../src/app.js';
import { signToken } from '../src/services/jwt.js';
import { prisma } from '../src/config/prisma.js';

// The real application, so these exercise the same middleware chain the
// server runs — error mapping included — instead of a stand-in that can
// drift from it.
const app = createApp();

const applicantId = 'test-applicant-answer';
const otherApplicantId = 'test-applicant-answer-2';
const applicantToken = signToken({
  id: applicantId,
  email: 'applicant-answer@test.local',
  role: 'APPLICANT',
});
const recruiterToken = signToken({
  id: 'test-recruiter-answer',
  email: 'recruiter-answer@test.local',
  role: 'RECRUITER',
});

let mcQuestionId: string;
let mcOptionAId: string;
let mcOptionBId: string;
let checkboxQuestionId: string;
let checkboxOptionIds: string[];
let shortTextQuestionId: string;
let likertQuestionId: string;
let foreignOptionId: string; // belongs to a different question, for cross-question validation
let attemptId: string;

beforeAll(async () => {
  await prisma.user.createMany({
    data: [
      {
        id: applicantId,
        email: 'applicant-answer@test.local',
        passwordHash: 'x',
        firstName: 'T',
        lastName: 'A',
        role: 'APPLICANT',
      },
      {
        id: otherApplicantId,
        email: 'other-answer@test.local',
        passwordHash: 'x',
        firstName: 'T',
        lastName: 'B',
        role: 'APPLICANT',
      },
    ],
    skipDuplicates: true,
  });

  const mcQuestion = await prisma.certificationQuestion.create({
    data: {
      order: 900,
      type: 'MULTIPLE_CHOICE',
      text: 'test MC question',
      weight: 1,
      maxPoints: 10,
      options: {
        create: [
          { text: 'A', points: 0, order: 1 },
          { text: 'B', points: 10, order: 2 },
        ],
      },
    },
    include: { options: true },
  });
  mcQuestionId = mcQuestion.id;
  mcOptionAId = mcQuestion.options[0]!.id;
  mcOptionBId = mcQuestion.options[1]!.id;

  const checkboxQuestion = await prisma.certificationQuestion.create({
    data: {
      order: 901,
      type: 'CHECKBOX',
      text: 'test CHECKBOX question',
      weight: 1,
      maxPoints: 10,
      options: {
        create: [
          { text: 'A', points: 3, order: 1 },
          { text: 'B', points: 3, order: 2 },
          { text: 'C', points: 4, order: 3 },
        ],
      },
    },
    include: { options: true },
  });
  checkboxQuestionId = checkboxQuestion.id;
  checkboxOptionIds = checkboxQuestion.options.map((o) => o.id);

  const shortTextQuestion = await prisma.certificationQuestion.create({
    data: {
      order: 902,
      type: 'SHORT_TEXT',
      text: 'test SHORT_TEXT question',
      weight: 1,
      maxPoints: 5,
    },
  });
  shortTextQuestionId = shortTextQuestion.id;

  const likertQuestion = await prisma.certificationQuestion.create({
    data: {
      order: 903,
      type: 'LIKERT_SCALE',
      text: 'test LIKERT_SCALE question',
      weight: 1,
      maxPoints: 10,
    },
  });
  likertQuestionId = likertQuestion.id;

  const otherQuestion = await prisma.certificationQuestion.create({
    data: {
      order: 904,
      type: 'MULTIPLE_CHOICE',
      text: 'unrelated question',
      weight: 1,
      maxPoints: 10,
      options: {
        create: [
          { text: 'X', points: 0, order: 1 },
          { text: 'Y', points: 10, order: 2 },
        ],
      },
    },
    include: { options: true },
  });
  foreignOptionId = otherQuestion.options[0]!.id;
});

beforeEach(async () => {
  await prisma.certificationAttempt.deleteMany({
    where: { userId: { in: [applicantId, otherApplicantId] } },
  });
  const attempt = await prisma.certificationAttempt.create({ data: { userId: applicantId } });
  attemptId = attempt.id;
});

afterAll(async () => {
  await prisma.certificationQuestion.deleteMany({
    where: { order: { in: [900, 901, 902, 903, 904] } },
  });
  await prisma.user.deleteMany({ where: { id: { in: [applicantId, otherApplicantId] } } });
  await prisma.$disconnect();
});

const answerUrl = () => `/api/certification/attempt/${attemptId}/answer`;

describe('POST /certification/attempt/:attemptId/answer — auth & ownership', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app)
      .post(answerUrl())
      .send({ questionId: mcQuestionId, optionId: mcOptionAId });
    expect(res.status).toBe(401);
  });

  it('rejects non-applicant roles', async () => {
    const res = await request(app)
      .post(answerUrl())
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ questionId: mcQuestionId, optionId: mcOptionAId });
    expect(res.status).toBe(403);
  });

  it('returns 404 for an unknown attempt', async () => {
    const res = await request(app)
      .post('/api/certification/attempt/does-not-exist/answer')
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({ questionId: mcQuestionId, optionId: mcOptionAId });
    expect(res.status).toBe(404);
  });

  it("returns 403 for someone else's attempt", async () => {
    const otherToken = signToken({
      id: otherApplicantId,
      email: 'other-answer@test.local',
      role: 'APPLICANT',
    });
    const res = await request(app)
      .post(answerUrl())
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ questionId: mcQuestionId, optionId: mcOptionAId });
    expect(res.status).toBe(403);
  });

  it('returns 404 for an unknown question', async () => {
    const res = await request(app)
      .post(answerUrl())
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({ questionId: 'does-not-exist', optionId: mcOptionAId });
    expect(res.status).toBe(404);
  });
});

describe('MULTIPLE_CHOICE', () => {
  it('saves a valid answer without exposing pointsEarned', async () => {
    const res = await request(app)
      .post(answerUrl())
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({ questionId: mcQuestionId, optionId: mcOptionAId });

    expect(res.status).toBe(201);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].optionId).toBe(mcOptionAId);
    expect(res.body[0]).not.toHaveProperty('pointsEarned');
  });

  it('rejects a missing optionId', async () => {
    const res = await request(app)
      .post(answerUrl())
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({ questionId: mcQuestionId });
    expect(res.status).toBe(400);
  });

  it('rejects an optionId belonging to a different question', async () => {
    const res = await request(app)
      .post(answerUrl())
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({ questionId: mcQuestionId, optionId: foreignOptionId });
    expect(res.status).toBe(400);
  });

  it('replaces the previous answer instead of accumulating', async () => {
    await request(app)
      .post(answerUrl())
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({ questionId: mcQuestionId, optionId: mcOptionAId });

    const second = await request(app)
      .post(answerUrl())
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({ questionId: mcQuestionId, optionId: mcOptionBId });

    expect(second.status).toBe(201);
    const rows = await prisma.answer.findMany({ where: { attemptId, questionId: mcQuestionId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.optionId).toBe(mcOptionBId);
  });
});

describe('CHECKBOX', () => {
  it('saves one Answer row per selected option', async () => {
    const res = await request(app)
      .post(answerUrl())
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({
        questionId: checkboxQuestionId,
        optionIds: [checkboxOptionIds[0], checkboxOptionIds[1]],
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveLength(2);
  });

  it('rejects an empty optionIds array', async () => {
    const res = await request(app)
      .post(answerUrl())
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({ questionId: checkboxQuestionId, optionIds: [] });
    expect(res.status).toBe(400);
  });
});

describe('SHORT_TEXT', () => {
  it('saves a valid textAnswer', async () => {
    const res = await request(app)
      .post(answerUrl())
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({ questionId: shortTextQuestionId, textAnswer: 'a real answer' });
    expect(res.status).toBe(201);
    expect(res.body[0].textAnswer).toBe('a real answer');
  });

  it('rejects an empty textAnswer', async () => {
    const res = await request(app)
      .post(answerUrl())
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({ questionId: shortTextQuestionId, textAnswer: '   ' });
    expect(res.status).toBe(400);
  });
});

describe('LIKERT_SCALE', () => {
  it('saves a valid numericAnswer', async () => {
    const res = await request(app)
      .post(answerUrl())
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({ questionId: likertQuestionId, numericAnswer: 4 });
    expect(res.status).toBe(201);
    expect(res.body[0].numericAnswer).toBe(4);
  });

  it('rejects a numericAnswer outside 1-5', async () => {
    const res = await request(app)
      .post(answerUrl())
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({ questionId: likertQuestionId, numericAnswer: 6 });
    expect(res.status).toBe(400);
  });
});

describe('attempt lifecycle', () => {
  it('bumps lastActivityAt on the attempt', async () => {
    const before = await prisma.certificationAttempt.findUniqueOrThrow({
      where: { id: attemptId },
    });

    await new Promise((resolve) => setTimeout(resolve, 5));
    await request(app)
      .post(answerUrl())
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({ questionId: mcQuestionId, optionId: mcOptionAId });

    const after = await prisma.certificationAttempt.findUniqueOrThrow({ where: { id: attemptId } });
    expect(after.lastActivityAt.getTime()).toBeGreaterThan(before.lastActivityAt.getTime());
  });

  it('rejects saving an answer once the attempt is no longer IN_PROGRESS', async () => {
    await prisma.certificationAttempt.update({
      where: { id: attemptId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    const res = await request(app)
      .post(answerUrl())
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({ questionId: mcQuestionId, optionId: mcOptionAId });
    expect(res.status).toBe(409);
  });
});
