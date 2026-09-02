import { z } from 'zod';
import { MIN_APPLICANT_AGE } from '@profils-actifs/shared';
import { calculateAge } from '../utils/age.js';

export const registerSchema = z.object({
  email: z.email({ error: 'Email invalide' }),
  password: z.string().min(8, { error: 'Le mot de passe doit contenir au moins 8 caractères' }),
  firstName: z.string().min(1, { error: 'Prénom requis' }),
  lastName: z.string().min(1, { error: 'Nom requis' }),
  role: z.enum(['APPLICANT', 'RECRUITER'], {
    error: 'Rôle invalide',
  }),
  birthDate: z.coerce
    .date({ error: 'Date de naissance invalide' })
    .refine((date) => calculateAge(date) >= MIN_APPLICANT_AGE, {
      error: `Vous devez avoir au moins ${MIN_APPLICANT_AGE} ans pour vous inscrire`,
    }),
});

export const loginSchema = z.object({
  email: z.email({ error: 'Email invalide' }),
  password: z.string().min(1, { error: 'Mot de passe requis' }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
