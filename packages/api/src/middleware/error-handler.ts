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

const fromPrisma = (error: Prisma.PrismaClientKnownRequestError): ApiErrorResponse | null => {
  switch (error.code) {
    case 'P2025':
      return { error: 'not_found', message: 'Ressource introuvable', statusCode: 404 };
    case 'P2002':
      return { error: 'conflict', message: 'Cette ressource existe déjà', statusCode: 409 };
    case 'P2003':
      return { error: 'validation_error', message: 'Référence invalide', statusCode: 400 };
    default:
      return null;
  }
};

/**
 * Terminal error middleware. Express 5 forwards rejected promises from async
 * handlers here on its own, so route handlers do not wrap themselves in
 * try/catch.
 */
export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (res.headersSent) {
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

  if (error instanceof ZodError) {
    send(res, {
      error: 'validation_error',
      message: error.issues[0]?.message ?? 'Requête invalide',
      statusCode: 400,
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = fromPrisma(error);
    if (mapped) {
      send(res, mapped);
      return;
    }
  }

  // Unexpected: the cause is logged server-side and never described to the
  // client. Prisma renders its errors with the absolute source path, the
  // failing line and a code excerpt, so echoing them back — even outside
  // production, which is the default NODE_ENV — hands out the deployment
  // layout for free.
  console.error('[api] unhandled error', error);
  send(res, {
    error: 'internal_error',
    message: 'Erreur interne',
    statusCode: 500,
  });
};
