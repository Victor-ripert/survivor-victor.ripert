import { z } from 'zod';
import {
  calculateAge,
  MIN_APPLICANT_AGE,
  PASSWORD_MIN_LENGTH,
  SELF_REGISTRABLE_ROLES,
} from '@profils-actifs/shared';

/**
 * Client-side twin of the API's `registerSchema`, so the candidate reads the
 * under-16 refusal before a round trip. The API validates independently and
 * stays the authority.
 */
export const registerFormSchema = z
  .object({
    role: z.enum(SELF_REGISTRABLE_ROLES),
    firstName: z.string().trim().min(1, { error: 'Prénom requis' }),
    lastName: z.string().trim().min(1, { error: 'Nom requis' }),
    email: z
      .string()
      .trim()
      .pipe(z.email({ error: 'Adresse e-mail invalide' })),
    password: z.string().min(PASSWORD_MIN_LENGTH, {
      error: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères`,
    }),
    birthDate: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.role !== 'APPLICANT') return;

    const date = new Date(values.birthDate);
    if (!values.birthDate || Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: 'custom', path: ['birthDate'], message: 'Date de naissance requise' });
      return;
    }

    if (calculateAge(date) < MIN_APPLICANT_AGE) {
      ctx.addIssue({
        code: 'custom',
        path: ['birthDate'],
        message: `Vous devez avoir au moins ${MIN_APPLICANT_AGE} ans pour vous inscrire.`,
      });
    }
  });

export type RegisterFormValues = z.infer<typeof registerFormSchema>;

export const EMPTY_REGISTER_FORM: RegisterFormValues = {
  role: 'APPLICANT',
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  birthDate: '',
};
