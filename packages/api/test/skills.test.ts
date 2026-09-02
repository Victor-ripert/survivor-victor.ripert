import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { signToken } from '../src/services/jwt.js';

const app = createApp();

describe('profile skills', () => {
  let userId: string;
  let token: string;
  const skillName = `Compétence ${randomUUID()}`;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `applicant-${randomUUID()}@test.local`,
        passwordHash: 'x',
        firstName: 'Skill',
        lastName: 'Test',
        role: 'APPLICANT',
      },
    });
    userId = user.id;
    token = signToken({ id: user.id, email: user.email, role: 'APPLICANT' });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.skill.deleteMany({ where: { name: { equals: skillName, mode: 'insensitive' } } });
    await prisma.$disconnect();
  });

  it('lists the catalog publicly', async () => {
    const response = await request(app).get('/api/skills');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0]).toEqual({ id: expect.any(String), name: expect.any(String) });
  });

  it('refuses to tag a skill before the profile exists', async () => {
    const response = await request(app)
      .post('/api/profiles/me/skills')
      .set('Authorization', `Bearer ${token}`)
      .send({ skillName });

    expect(response.status).toBe(404);
  });

  it('tags a new skill, then updates its level instead of duplicating it', async () => {
    await request(app)
      .post('/api/profiles/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ location: 'Lyon', sector: 'Informatique' });

    const first = await request(app)
      .post('/api/profiles/me/skills')
      .set('Authorization', `Bearer ${token}`)
      .send({ skillName: `  ${skillName}  `, level: 'BEGINNER' });
    expect(first.status).toBe(200);
    expect(first.body.skills).toHaveLength(1);
    expect(first.body.skills[0]).toMatchObject({ skillName, level: 'BEGINNER' });

    const second = await request(app)
      .post('/api/profiles/me/skills')
      .set('Authorization', `Bearer ${token}`)
      .send({ skillName: skillName.toUpperCase(), level: 'EXPERT' });
    expect(second.status).toBe(200);
    expect(second.body.skills).toHaveLength(1);
    expect(second.body.skills[0]).toMatchObject({ skillName, level: 'EXPERT' });
  });

  it('removes the skill, and answers 404 the second time', async () => {
    const own = await request(app).get('/api/profiles/me').set('Authorization', `Bearer ${token}`);
    const skillId = own.body.skills[0].skillId as string;

    const removed = await request(app)
      .delete(`/api/profiles/me/skills/${skillId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(removed.status).toBe(204);

    const again = await request(app)
      .delete(`/api/profiles/me/skills/${skillId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(again.status).toBe(404);
  });
});
