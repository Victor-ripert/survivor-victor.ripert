import { jest } from '@jest/globals';
import request from 'supertest';
import { createPrismaMock, asPrismaClient, type PrismaMock } from '../../test/prisma-mock.js';

const prismaMock: PrismaMock = createPrismaMock();

jest.unstable_mockModule('../config/prisma.js', () => ({
  prisma: asPrismaClient(prismaMock),
}));

const { createApp } = await import('../app.js');

const app = createApp();

beforeEach(() => {
  prismaMock.$queryRaw.mockReset();
});

describe('GET /api/health', () => {
  it('answers 200 while the database accepts a query', async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', database: { status: 'up' } });
  });

  // §8.2 wants a probe that reports something real: an API whose database is
  // gone must be taken out of rotation, not answer 200 because the process
  // happens to be alive.
  it('answers 503 when the database is unreachable', async () => {
    prismaMock.$queryRaw.mockRejectedValue(new Error('connection refused'));

    const response = await request(app).get('/api/health');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ status: 'degraded', database: { status: 'down' } });
  });

  // `npm_package_version` is only set when npm starts the process, so a
  // deployment running `node dist/index.js` used to report "unknown" — the one
  // case where the version actually matters.
  it('reports the real package version, not a placeholder', async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const response = await request(app).get('/api/health');

    expect(response.body.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('answers without consuming the caller`s rate-limit budget', async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const response = await request(app).get('/api/health');

    expect(response.headers).not.toHaveProperty('ratelimit');
  });
});
