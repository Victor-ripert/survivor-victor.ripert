import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { env } from '../config/env.js';

export interface AuthTokenPayload {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * A signature only proves we minted the token, not that its body still matches
 * what `req.user` is typed as — a payload shape from an older release would
 * otherwise flow into the handlers unchecked. Parsing also strips `iat`/`exp`,
 * so nothing downstream sees claims it has no business reading.
 */
const tokenPayloadSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  role: z.enum(UserRole),
});

export const signToken = (payload: AuthTokenPayload): string =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRY });

export const verifyToken = (token: string): AuthTokenPayload =>
  tokenPayloadSchema.parse(jwt.verify(token, env.JWT_SECRET));
