import type { Request, Response } from 'express';
import type { User } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { registerSchema, loginSchema } from '../validators/auth.js';
import { hashPassword, verifyPassword } from '../services/password.js';
import { signToken } from '../services/jwt.js';
import { currentUser } from '../utils/current-user.js';
import { conflict, forbidden, unauthorized } from '../utils/http-error.js';

const toPublicUser = (user: User) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role,
});

export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, firstName, lastName, role, birthDate } = registerSchema.parse(req.body);

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw conflict('Cette adresse e-mail est déjà utilisée');

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, firstName, lastName, role, birthDate },
  });

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  res.status(201).json({ token, user: toPublicUser(user) });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });

  // An unknown address and a wrong password answer identically, so the
  // endpoint cannot be used to find out who holds an account.
  const isValidPassword = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !isValidPassword) throw unauthorized('Identifiants invalides');

  if (!user.isActive) throw forbidden('Ce compte est désactivé');

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  res.status(200).json({ token, user: toPublicUser(user) });
};

export const me = async (req: Request, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: currentUser(req).id } });

  if (!user || !user.isActive) throw unauthorized('Compte introuvable ou désactivé');

  res.status(200).json(toPublicUser(user));
};
