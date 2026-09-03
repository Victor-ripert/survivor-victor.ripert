import type { Request, Response } from 'express';
import type { User } from '@prisma/client';
import type { AuthResponse, AuthUser } from '@profils-actifs/shared';
import { prisma } from '../config/prisma.js';
import { signToken } from '../services/jwt.js';
import { hashPassword, verifyPassword } from '../services/password.js';
import { currentUser } from '../utils/current-user.js';
import { conflict, forbidden, unauthorized } from '../utils/http-error.js';
import { loginSchema, registerSchema } from '../validators/auth.js';

const ISO_DATE_LENGTH = 'YYYY-MM-DD'.length;

/** The only shape a `User` row ever leaves the API in: never the password hash. */
const toAuthUser = (user: User): AuthUser => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role,
  birthDate: user.birthDate ? user.birthDate.toISOString().slice(0, ISO_DATE_LENGTH) : null,
});

const toAuthResponse = (user: User): AuthResponse => ({
  token: signToken({ id: user.id, email: user.email, role: user.role }),
  user: toAuthUser(user),
});

export const register = async (req: Request, res: Response): Promise<void> => {
  const input = registerSchema.parse(req.body);

  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingUser) throw conflict('Cette adresse e-mail est déjà utilisée');

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash: await hashPassword(input.password),
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      // Only job-seekers are asked for one — see validators/auth.ts.
      birthDate: input.role === 'APPLICANT' ? input.birthDate : null,
    },
  });

  res.status(201).json(toAuthResponse(user));
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });

  // An unknown address and a wrong password answer identically, so the
  // endpoint cannot be used to find out who holds an account.
  const isValidPassword = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !isValidPassword) throw unauthorized('Identifiants invalides');

  if (!user.isActive) throw forbidden('Ce compte est désactivé');

  res.status(200).json(toAuthResponse(user));
};

export const me = async (req: Request, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: currentUser(req).id } });

  if (!user || !user.isActive) throw unauthorized('Compte introuvable ou désactivé');

  res.status(200).json(toAuthUser(user));
};
