import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import type { ApiErrorResponse } from '@profils-actifs/shared';
import { HttpError } from '../utils/http-error.js';

const send = (res: Response, body: ApiErrorResponse): void => {
  res.status(body.statusCode).json(body);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  send(res, {
    error: 'not_found',
    message: `Route inconnue : ${req.method} ${req.path}`,
    statusCode: 404,
  });
};

/**
 * Connection-level failures. Prisma 7 talks to Postgres through a driver
 * adapter and passes the driver's own code straight through, so a database
 * that is down does not arrive as a `P####` code at all: it arrives as the
 * socket errno (`ECONNREFUSED` when Postgres is stopped) or as a Postgres
 * SQLSTATE. Class `08` is the standard "connection exception" family;
 * `57P01`/`57P03` are a server shutting down or still starting, and `53300` is
 * a full connection slot table. Every one of them is transient by nature.
 */
const CONNECTION_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EPIPE',
  '57P01',
  '57P03',
  '53300',
]);

const isConnectionFailure = (code: string): boolean =>
  CONNECTION_ERROR_CODES.has(code) || code.startsWith('08');

const unavailable = (message: string): ApiErrorResponse => ({
  error: 'service_unavailable',
  message,
  statusCode: 503,
});

/**
 * Prisma's known request errors, mapped to what the caller can do about them.
 * Anything absent from this table is a bug rather than a foreseeable outcome,
 * so it falls through to the opaque 500 below and is logged in full.
 */
const fromPrismaCode = (code: string): ApiErrorResponse | null => {
  switch (code) {
    case 'P2025':
      return { error: 'not_found', message: 'Ressource introuvable', statusCode: 404 };
    case 'P2002':
      return { error: 'conflict', message: 'Cette ressource existe déjà', statusCode: 409 };
    case 'P2003':
      return { error: 'validation_error', message: 'Référence invalide', statusCode: 400 };
    // Serializable transaction lost a race. `startOrResumeAttempt` retries it
    // itself; anything that reaches here exhausted its retries, and the caller
    // simply repeating the request is the right move.
    case 'P2034':
      return {
        error: 'conflict',
        message: 'Conflit avec une autre modification simultanée, réessayez',
        statusCode: 409,
      };
    // Every connection in the pool is busy — the API is up, the database is
    // saturated. Retryable, so it is a 503 rather than an opaque failure.
    case 'P2024':
      return unavailable('Service momentanément saturé, réessayez dans un instant');
    default:
      return isConnectionFailure(code)
        ? unavailable('Service momentanément indisponible, réessayez dans un instant')
        : null;
  }
};

/** An `express.json()` payload over the body limit arrives as a tagged error
 *  rather than an exception of its own type. */
const isPayloadTooLarge = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { type?: string }).type === 'entity.too.large';

/** The database refused the connection outright — process still up, dependency
 *  gone. `/api/health` reports the same state on its own probe. */
const isDatabaseUnreachable = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientInitializationError ||
  error instanceof Prisma.PrismaClientRustPanicError;

/**
 * Terminal error middleware. Express 5 forwards rejected promises from async
 * handlers here on its own, so route handlers do not wrap themselves in
 * try/catch.
 */
export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // The response already started, so its status line is long gone and nothing
  // can be sent on top of it. Express's own finalhandler closes the socket.
  if (res.headersSent) {
    console.error(`[api] error after headers sent on ${req.method} ${req.originalUrl}`, error);
    next(error);
    return;
  }

  if (error instanceof HttpError) {
    send(res, { error: error.code, message: error.message, statusCode: error.statusCode });
    return;
  }

  // express.json() rejects malformed payloads with a tagged SyntaxError.
  if (error instanceof SyntaxError && 'body' in error) {
    send(res, {
      error: 'validation_error',
      message: 'Corps de requête JSON invalide',
      statusCode: 400,
    });
    return;
  }

  if (isPayloadTooLarge(error)) {
    send(res, {
      error: 'payload_too_large',
      message: 'Corps de requête trop volumineux',
      statusCode: 413,
    });
    return;
  }

  if (error instanceof ZodError) {
    send(res, {
      error: 'validation_error',
      message: error.issues[0]?.message ?? 'Requête invalide',
      statusCode: 400,
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = fromPrismaCode(error.code);
    if (mapped) {
      // A dependency being down is an operations event, not a caller mistake:
      // it is worth a log line, unlike an ordinary 404 or 409.
      if (mapped.statusCode === 503) {
        console.error(
          `[api] database unavailable (${error.code}) on ${req.method} ${req.originalUrl}`,
        );
      }

      send(res, mapped);
      return;
    }
  }

  if (isDatabaseUnreachable(error)) {
    console.error(`[api] database unreachable on ${req.method} ${req.originalUrl}`, error);
    send(res, unavailable('Service momentanément indisponible, réessayez dans un instant'));
    return;
  }

  // Unexpected: the cause is logged server-side — with the route that produced
  // it, which is what makes the line actionable — and never described to the
  // client. Prisma renders its errors with the absolute source path, the
  // failing line and a code excerpt, so echoing them back — even outside
  // production, which is the default NODE_ENV — hands out the deployment
  // layout for free.
  console.error(`[api] unhandled error on ${req.method} ${req.originalUrl}`, error);
  send(res, {
    error: 'internal_error',
    message: 'Erreur interne',
    statusCode: 500,
  });
};
