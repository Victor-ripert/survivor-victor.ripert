import { z } from 'zod';
import { calculateAge, MIN_APPLICANT_AGE, PASSWORD_MIN_LENGTH } from '@profils-actifs/shared';
import { printableText } from './common.js';

const NAME_MAX_LENGTH = 80;

/** Lower-cased before the format check so `Jane@Example.fr` and
 *  `jane@example.fr` are one account, not two. */
const emailSchema = z
  .string({ error: 'Email invalide' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Email invalide' }));

const credentials = {
  email: emailSchema,
  password: z.string({ error: 'Mot de passe requis' }).min(PASSWORD_MIN_LENGTH, {
    error: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères`,
  }),
  firstName: printableText(NAME_MAX_LENGTH, 'Prénom requis'),
  lastName: printableText(NAME_MAX_LENGTH, 'Nom requis'),
};

/** Strict block under 16 (brief §7.9.1). A future date fails the same check,
 *  since it yields a negative age. */
const birthDateSchema = z.coerce
  .date({ error: 'Date de naissance invalide' })
  .refine((date) => calculateAge(date) >= MIN_APPLICANT_AGE, {
    error: `Vous devez avoir au moins ${MIN_APPLICANT_AGE} ans pour vous inscrire`,
  });

/**
 * Only job-seekers hand over a birth date: the minors' regime is theirs, and
 * collecting it from recruiters would be data the platform has no use for.
 * `ADMIN` is deliberately not self-assignable — admin accounts come from the
 * seed.
 */
export const registerSchema = z.discriminatedUnion(
  'role',
  [
    z.object({ ...credentials, role: z.literal('APPLICANT'), birthDate: birthDateSchema }),
    z.object({ ...credentials, role: z.literal('RECRUITER') }),
  ],
  { error: 'Rôle invalide' },
);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: 'Mot de passe requis' }).min(1, { error: 'Mot de passe requis' }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
