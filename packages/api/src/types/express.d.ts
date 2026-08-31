import type { AuthTokenPayload } from '../services/jwt.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export {};