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

/** The payload parsed cleanly but contradicts the resource it targets — an
 *  answer that does not fit the question's actual type, an admin patch whose
 *  effective result would break a rule. Detecting it needs a database read,
 *  which is what separates it from `badRequest`. */
export const unprocessableEntity = (message: string): HttpError =>
  new HttpError(422, 'unprocessable_entity', message);

export const conflict = (message: string): HttpError => new HttpError(409, 'conflict', message);

export const tooManyRequests = (message: string): HttpError =>
  new HttpError(429, 'too_many_requests', message);

export const payloadTooLarge = (message: string): HttpError =>
  new HttpError(413, 'payload_too_large', message);

/** A capability the contract documents but this server does not provide yet
 *  — answered honestly rather than with a misleading 400. */
export const notImplemented = (message: string): HttpError =>
  new HttpError(501, 'not_implemented', message);

/** A server-side misconfiguration the caller cannot fix, but which is worth
 *  naming rather than hiding behind a generic failure. */
export const internalError = (message: string): HttpError =>
  new HttpError(500, 'internal_error', message);

/** A dependency is unreachable — the database refused a connection, or the
 *  pool timed out. Separate from `internalError` because the request is worth
 *  retrying, and the caller is told so rather than left guessing. */
export const serviceUnavailable = (
  message = 'Service momentanément indisponible, réessayez dans un instant',
): HttpError => new HttpError(503, 'service_unavailable', message);
