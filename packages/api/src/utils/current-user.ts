import type { Request } from 'express';
import type { AuthTokenPayload } from '../services/jwt.js';
import { unauthorized } from './http-error.js';

/**
 * Reads the authenticated caller off a request. Routes behind `requireAuth`
 * always have one; this keeps handlers free of non-null assertions and turns a
 * middleware wiring mistake into a 401 rather than a crash.
 */
export const currentUser = (req: Request): AuthTokenPayload => {
  if (!req.user) throw unauthorized();
  return req.user;
};
