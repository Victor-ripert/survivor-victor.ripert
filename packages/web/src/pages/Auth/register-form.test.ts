import { EMPTY_REGISTER_FORM, registerFormSchema } from './register-form.js';

const isoDateYearsAgo = (years: number): string => {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date.toISOString().slice(0, 10);
};

const applicant = {
  ...EMPTY_REGISTER_FORM,
  firstName: 'Amina',
  lastName: 'Berthier',
  email: 'amina@example.fr',
  password: 'Password123!',
  birthDate: isoDateYearsAgo(20),
};

describe('registerFormSchema', () => {
  it('accepts an adult job-seeker', () => {
    expect(registerFormSchema.safeParse(applicant).success).toBe(true);
  });

  // Brief §7.9.1: strict block below 16, read before any round trip.
  it('refuses a 15-year-old with the message the candidate reads', () => {
    const parsed = registerFormSchema.safeParse({ ...applicant, birthDate: isoDateYearsAgo(15) });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toEqual(['birthDate']);
      expect(parsed.error.issues[0]?.message).toMatch(/au moins 16 ans/);
    }
  });

  it('requires a birth date from a job-seeker', () => {
    expect(registerFormSchema.safeParse({ ...applicant, birthDate: '' }).success).toBe(false);
  });

  it('never asks a recruiter for a birth date', () => {
    const recruiter = { ...applicant, role: 'RECRUITER' as const, birthDate: '' };
    expect(registerFormSchema.safeParse(recruiter).success).toBe(true);
  });

  it('rejects a short password', () => {
    expect(registerFormSchema.safeParse({ ...applicant, password: 'short' }).success).toBe(false);
  });
});
