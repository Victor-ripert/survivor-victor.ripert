import { z } from 'zod';

export const registerSchema = z.object({
  email: z.email({ error: 'Email invalide' }),
  password: z
    .string()
    .min(8, { error: 'Le mot de passe doit contenir au moins 8 caractères' }),
  firstName: z.string().min(1, { error: 'Prénom requis' }),
  lastName: z.string().min(1, { error: 'Nom requis' }),
  role: z.enum(['APPLICANT', 'RECRUITER'], {
    error: 'Rôle invalide',
  }),
});

export const loginSchema = z.object({
  email: z.email({ error: 'Email invalide' }),
  password: z.string().min(1, { error: 'Mot de passe requis' }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
