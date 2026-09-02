import rateLimit, { ipKeyGenerator, type Options } from 'express-rate-limit';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { tooManyRequests } from '../utils/http-error.js';

/** Handed to the error middleware like any other failure, so a throttled
 *  request answers in exactly the same shape as every other error. */
const rejection =
  (message: string) =>
  (_req: Request, _res: Response, next: NextFunction): void =>
    next(tooManyRequests(message));

/** Authenticated callers are limited per account so that several colleagues
 *  behind one office IP do not consume each other's quota; anonymous traffic
 *  falls back to the (IPv6-safe) IP key. */
const perUserOrIp: Options['keyGenerator'] = (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? '');

export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rejection('Trop de requêtes, réessayez plus tard'),
});

/** Sending a message reaches a real person's notification list, so it gets a
 *  tighter budget than ordinary reads on top of the per-applicant daily cap. */
export const contactRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: perUserOrIp,
  handler: rejection("Trop de prises de contact envoyées, réessayez dans l'heure"),
});
