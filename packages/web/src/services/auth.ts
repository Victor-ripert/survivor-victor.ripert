import type { AuthResponse, AuthUser, SelfRegistrableRole } from '@profils-actifs/shared';
import { api } from './api.js';

export interface RegisterInput {
  role: SelfRegistrableRole;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  /** ISO date, sent for a job-seeker only (brief §7.9.1). */
  birthDate?: string;
}

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/login', { email, password });
  return response.data;
};

export const register = async (input: RegisterInput): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/register', input);
  return response.data;
};

export const fetchCurrentUser = async (signal?: AbortSignal): Promise<AuthUser> => {
  const response = await api.get<AuthUser>('/auth/me', { signal });
  return response.data;
};
