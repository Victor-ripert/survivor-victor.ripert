import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@prisma/client';
import { verifyToken } from '../services/jwt.js';
import { forbidden, unauthorized } from '../utils/http-error.js';

/** Only the `Bearer` scheme carries our tokens; splitting on whitespace alone
 *  would just as happily accept a `Basic` credential as a JWT. */
const readBearerToken = (header: string | undefined): string | null => {
  const [scheme, value, ...rest] = header?.split(' ') ?? [];

  if (scheme?.toLowerCase() !== 'bearer' || !value || rest.length > 0) return null;

  return value;
};

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const token = readBearerToken(req.headers.authorization);

  if (!token) {
    next(unauthorized('Aucun jeton fourni'));
    return;
  }

  try {
    req.user = verifyToken(token);
  } catch {
    next(unauthorized('Jeton invalide ou expiré'));
    return;
  }

  next();
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      next(forbidden());
      return;
    }

    next();
  };
};
