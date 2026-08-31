import type { Request, Response } from 'express';
import type { User } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { registerSchema, loginSchema } from '../validators/auth.js';
import { hashPassword, verifyPassword } from '../services/password.js';
import { signToken } from '../services/jwt.js';

const toPublicUser = (user: User) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role,
});

export const register = async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'validation_error',
      message: parsed.error.issues[0]?.message ?? 'Invalid input',
      statusCode: 400,
    });
    return;
  }

  const { email, password, firstName, lastName, role } = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    res.status(409).json({
      error: 'conflict',
      message: 'Email already in use',
      statusCode: 409,
    });
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, firstName, lastName, role },
  });

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  res.status(201).json({ token, user: toPublicUser(user) });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: 'validation_error',
      message: parsed.error.issues[0]?.message ?? 'Invalid input',
      statusCode: 400,
    });
    return;
  }
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid credentials',
      statusCode: 401,
    });
    return;
  }
  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid credentials',
      statusCode: 401,
    });
    return;
  }
  if (!user.isActive) {
    res.status(403).json({
      error: 'forbidden',
      message: 'Account is deactivated',
      statusCode: 403,
    });
    return;
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  res.status(200).json({ token, user: toPublicUser(user) });
};

export const me = async (req: Request, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

  if (!user || !user.isActive) {
    res.status(401).json({
      error: 'unauthorized',
      message: 'User not found or inactive',
      statusCode: 401,
    });
    return;
  }
  res.status(200).json(toPublicUser(user));
};
