import request from 'supertest';
import { UserRole } from '@prisma/client';
import { createApp } from '../app.js';
import { signToken } from '../services/jwt.js';

const app = createApp();

const bearer = (role: UserRole): string =>
  `Bearer ${signToken({ id: `user-${role}`, email: `${role}@example.fr`, role })}`;

describe('domain D access control', () => {
  it.each([
    ['/api/recruiter/catalogue'],
    ['/api/recruiter/catalogue/facets'],
    ['/api/recruiter/favorites'],
    ['/api/recruiter/dashboard'],
    ['/api/admin/dashboard'],
    ['/api/interactions'],
  ])('answers 401 on %s without a token', async (path) => {
    const response = await request(app).get(path);

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: 'unauthorized', statusCode: 401 });
  });

  it('answers 401 for a token that is not ours', async () => {
    const response = await request(app)
      .get('/api/recruiter/catalogue')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(response.status).toBe(401);
  });

  it.each([
    ['/api/recruiter/catalogue'],
    ['/api/recruiter/favorites'],
    ['/api/recruiter/dashboard'],
  ])('keeps job-seekers out of %s', async (path) => {
    const response = await request(app).get(path).set('Authorization', bearer(UserRole.APPLICANT));

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ error: 'forbidden', statusCode: 403 });
  });

  it('keeps recruiters out of the administration dashboard', async () => {
    const response = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', bearer(UserRole.RECRUITER));

    expect(response.status).toBe(403);
  });

  it('keeps job-seekers from creating interactions', async () => {
    const response = await request(app)
      .post('/api/interactions')
      .set('Authorization', bearer(UserRole.APPLICANT))
      .send({ recipientId: 'someone', type: 'VIEW' });

    expect(response.status).toBe(403);
  });
});

describe('request validation', () => {
  const recruiter = bearer(UserRole.RECRUITER);

  it('rejects an unknown sort option before reaching the database', async () => {
    const response = await request(app)
      .get('/api/recruiter/catalogue?sort=popularity')
      .set('Authorization', recruiter);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: 'validation_error', statusCode: 400 });
  });

  it('rejects a search term longer than the allowed length', async () => {
    const response = await request(app)
      .get(`/api/recruiter/catalogue?q=${'a'.repeat(101)}`)
      .set('Authorization', recruiter);

    expect(response.status).toBe(400);
  });

  it('rejects more skill filters than the cap allows', async () => {
    const skills = Array.from({ length: 11 }, (_, index) => `skill-${index}`).join(',');
    const response = await request(app)
      .get(`/api/recruiter/catalogue?skills=${skills}`)
      .set('Authorization', recruiter);

    expect(response.status).toBe(400);
  });

  it('rejects a score outside the 0-100 scale', async () => {
    const response = await request(app)
      .get('/api/recruiter/catalogue?minScore=140')
      .set('Authorization', recruiter);

    expect(response.status).toBe(400);
  });

  it('rejects a malformed JSON body', async () => {
    const response = await request(app)
      .post('/api/interactions')
      .set('Authorization', recruiter)
      .set('Content-Type', 'application/json')
      .send('{"recipientId":');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: 'validation_error' });
  });

  it('answers 404 with the uniform error shape on an unknown route', async () => {
    const response = await request(app).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ error: 'not_found', statusCode: 404 });
  });
});
