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
