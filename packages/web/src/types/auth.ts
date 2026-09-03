import type { UserRole } from '@profils-actifs/shared';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export type RegisterResponse = LoginResponse;

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Extract<UserRole, 'APPLICANT' | 'RECRUITER'>;
  birthDate: string; // ISO date (YYYY-MM-DD) — matches <input type="date">
}
