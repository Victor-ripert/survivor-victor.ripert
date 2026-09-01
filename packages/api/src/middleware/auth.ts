import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@prisma/client';
import { verifyToken } from '../services/jwt.js';
import { forbidden, unauthorized } from '../utils/http-error.js';

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];

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
