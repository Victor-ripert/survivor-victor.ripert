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
