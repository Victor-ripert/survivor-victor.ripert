import type { ApiErrorCode } from '@profils-actifs/shared';

/**
 * Any error a route handler throws deliberately. The error middleware turns it
 * into the uniform `{ error, message, statusCode }` body; anything else that
 * reaches the middleware is reported as an opaque 500.
 */
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string): HttpError =>
  new HttpError(400, 'validation_error', message);

export const unauthorized = (message = 'Authentification requise'): HttpError =>
  new HttpError(401, 'unauthorized', message);

export const forbidden = (message = 'Permissions insuffisantes'): HttpError =>
  new HttpError(403, 'forbidden', message);

export const notFound = (message = 'Ressource introuvable'): HttpError =>
  new HttpError(404, 'not_found', message);

export const conflict = (message: string): HttpError => new HttpError(409, 'conflict', message);

export const tooManyRequests = (message: string): HttpError =>
  new HttpError(429, 'too_many_requests', message);
