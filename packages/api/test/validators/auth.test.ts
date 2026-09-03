import { registerSchema } from '../../src/validators/auth.js';

const isoDateYearsAgo = (years: number): string => {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date.toISOString().slice(0, 10);
};

const applicant = {
  email: 'Jane.Doe@Example.fr',
  password: 'Password123!',
  firstName: 'Jane',
  lastName: 'Doe',
  role: 'APPLICANT',
  birthDate: isoDateYearsAgo(20),
};

describe('registerSchema', () => {
  it('accepts an adult job-seeker and lower-cases the email', () => {
    const parsed = registerSchema.parse(applicant);
    expect(parsed.email).toBe('jane.doe@example.fr');
  });

  it('accepts a 16-year-old job-seeker', () => {
    expect(registerSchema.safeParse({ ...applicant, birthDate: isoDateYearsAgo(16) }).success).toBe(
      true,
    );
  });

  // Brief §7.9.1: strict block below 16.
  it('refuses a 15-year-old with a message the candidate can read', () => {
    const parsed = registerSchema.safeParse({ ...applicant, birthDate: isoDateYearsAgo(15) });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toMatch(/au moins 16 ans/);
    }
  });

  it('requires a birth date from a job-seeker', () => {
    const { birthDate: _birthDate, ...withoutBirthDate } = applicant;
    expect(registerSchema.safeParse(withoutBirthDate).success).toBe(false);
  });

  it('never asks a recruiter for a birth date', () => {
    const { birthDate: _birthDate, ...recruiter } = { ...applicant, role: 'RECRUITER' };
    const parsed = registerSchema.parse(recruiter);
    expect(parsed).not.toHaveProperty('birthDate');
  });

  it('refuses to mint an administrator', () => {
    expect(registerSchema.safeParse({ ...applicant, role: 'ADMIN' }).success).toBe(false);
  });

  it('rejects a short password', () => {
    expect(registerSchema.safeParse({ ...applicant, password: 'short' }).success).toBe(false);
  });
});
