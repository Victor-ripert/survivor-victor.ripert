import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@prisma/client';
import { verifyToken } from '../services/jwt.js';

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    res.status(401).json({
      error: 'unauthorized',
      message: 'No token provided',
      statusCode: 401,
    });
    return;
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid or expired token',
      statusCode: 401,
    });
  }
};

/**
 * For routes that are public but still behave differently for a logged-in
 * caller — e.g. `GET /profiles/:id`, where the profile's own owner should
 * be able to preview it even while it's still `PENDING`, but a stranger
 * shouldn't. Unlike `requireAuth`, a missing or invalid token here is
 * *not* an error: the request just proceeds with `req.user` left unset,
 * exactly as if no `Authorization` header had been sent at all. Without
 * this, a route with no auth middleware at all would never populate
 * `req.user` even for a request that *does* carry a valid token — which
 * would make the profile/video services' `viewerId` parameter dead code.
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    next();
    return;
  }

  try {
    req.user = verifyToken(token);
  } catch {
    // Treated the same as no token — an anonymous request, not a rejected one.
  }
  next();
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'forbidden',
        message: 'Insufficient permissions',
        statusCode: 403,
      });
      return;
    }
    next();
  };
};
