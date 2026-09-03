import { jest } from '@jest/globals';
import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { errorHandler, notFoundHandler } from '../src/middleware/error-handler.js';
import { HttpError } from '../src/utils/http-error.js';

interface Captured {
  status: number | null;
  body: unknown;
}

/** Just enough of Express's response to record what the middleware sent. */
const fakeResponse = (headersSent = false) => {
  const captured: Captured = { status: null, body: null };
  const res = {
    headersSent,
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(body: unknown) {
      captured.body = body;
      return this;
    },
  };

  return { res: res as unknown as Response, captured };
};

const fakeRequest = (): Request =>
  ({ method: 'POST', path: '/api/profiles/me', originalUrl: '/api/profiles/me' }) as Request;

const handle = (error: unknown, headersSent = false) => {
  const { res, captured } = fakeResponse(headersSent);
  const next = jest.fn() as unknown as NextFunction;

  errorHandler(error, fakeRequest(), res, next);

  return { captured, next: next as unknown as jest.Mock };
};

let consoleError: jest.SpiedFunction<typeof console.error>;

beforeEach(() => {
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  consoleError.mockRestore();
});

describe('notFoundHandler', () => {
  it('names the route that matched nothing, in the uniform shape', () => {
    const { res, captured } = fakeResponse();

    notFoundHandler(fakeRequest(), res);

    expect(captured.status).toBe(404);
    expect(captured.body).toEqual({
      error: 'not_found',
      message: 'Route inconnue : POST /api/profiles/me',
      statusCode: 404,
    });
  });
});

describe('errorHandler', () => {
  it('answers an HttpError with its own code and status', () => {
    const { captured } = handle(new HttpError(403, 'forbidden', 'Permissions insuffisantes'));

    expect(captured.status).toBe(403);
    expect(captured.body).toEqual({
      error: 'forbidden',
      message: 'Permissions insuffisantes',
      statusCode: 403,
    });
  });

  it('turns a Zod failure into a 400 carrying the first message', () => {
    const parsed = z.object({ location: z.string() }).safeParse({});

    const { captured } = handle(parsed.success ? null : parsed.error);

    expect(captured.status).toBe(400);
    expect(captured.body).toMatchObject({ error: 'validation_error' });
  });

  it('reports malformed JSON as a validation error, not a crash', () => {
    const syntaxError = Object.assign(new SyntaxError('Unexpected end of JSON input'), {
      body: '{',
    });

    const { captured } = handle(syntaxError);

    expect(captured.status).toBe(400);
    expect(captured.body).toMatchObject({
      error: 'validation_error',
      message: 'Corps de requête JSON invalide',
    });
  });

  // express.json() rejects an oversized body with a tagged error rather than
  // an exception of its own type, so it used to fall through to an opaque 500.
  it('answers a body over the size limit with 413', () => {
    const tooLarge = Object.assign(new Error('request entity too large'), {
      type: 'entity.too.large',
    });

    const { captured } = handle(tooLarge);

    expect(captured.status).toBe(413);
    expect(captured.body).toMatchObject({ error: 'payload_too_large' });
  });

  const knownRequestError = (code: string): Prisma.PrismaClientKnownRequestError =>
    new Prisma.PrismaClientKnownRequestError('prisma failure', {
      code,
      clientVersion: 'test',
    });

  it.each([
    ['P2025', 404, 'not_found'],
    ['P2002', 409, 'conflict'],
    ['P2003', 400, 'validation_error'],
    ['P2034', 409, 'conflict'],
    ['P2024', 503, 'service_unavailable'],
  ])('maps Prisma %s to %i', (code, status, error) => {
    const { captured } = handle(knownRequestError(code));

    expect(captured.status).toBe(status);
    expect(captured.body).toMatchObject({ error });
  });

  // Prisma 7 goes through a driver adapter and hands the driver's own code
  // through, so a stopped Postgres arrives as ECONNREFUSED rather than a
  // P-code. Observed against a real server, not assumed.
  it.each([['ECONNREFUSED'], ['ECONNRESET'], ['ETIMEDOUT'], ['57P03'], ['53300'], ['08006']])(
    'answers 503 when the driver reports %s',
    (code) => {
      const { captured } = handle(knownRequestError(code));

      expect(captured.status).toBe(503);
      expect(captured.body).toMatchObject({ error: 'service_unavailable' });
    },
  );

  it('keeps an unmapped Prisma code opaque, and logs it', () => {
    const { captured } = handle(knownRequestError('P1234'));

    expect(captured.status).toBe(500);
    expect(captured.body).toMatchObject({ error: 'internal_error', message: 'Erreur interne' });
    expect(consoleError).toHaveBeenCalled();
  });

  // A database that refuses the connection is retryable, and saying so beats
  // an opaque 500 the caller cannot act on.
  it('answers 503 when the database is unreachable', () => {
    const { captured } = handle(
      new Prisma.PrismaClientInitializationError('connection refused', 'test'),
    );

    expect(captured.status).toBe(503);
    expect(captured.body).toMatchObject({ error: 'service_unavailable' });
  });

  it('never describes an unexpected failure to the client', () => {
    const { captured } = handle(new Error('at /srv/app/src/services/profile.service.ts:42'));

    expect(captured.status).toBe(500);
    expect(captured.body).toEqual({
      error: 'internal_error',
      message: 'Erreur interne',
      statusCode: 500,
    });
  });

  it('logs the route alongside an unexpected failure', () => {
    handle(new Error('boom'));

    expect(consoleError).toHaveBeenCalledWith(
      '[api] unhandled error on POST /api/profiles/me',
      expect.any(Error),
    );
  });

  // Once the status line is out, nothing can be written on top of it: the
  // middleware hands the error to Express rather than corrupting the response.
  it('forwards to Express when the response already started', () => {
    const { captured, next } = handle(new Error('late failure'), true);

    expect(captured.status).toBeNull();
    expect(next).toHaveBeenCalled();
  });
});
