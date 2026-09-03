import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthUser } from '@profils-actifs/shared';
import { setUnauthorizedHandler } from '../services/api.js';
import {
  fetchCurrentUser,
  login as loginRequest,
  register as registerRequest,
} from '../services/auth.js';
import type { RegisterInput } from '../services/auth.js';
import { clearToken, readToken, writeToken } from '../services/auth-storage.js';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() => (readToken() ? 'loading' : 'anonymous'));

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setStatus('anonymous');
  }, []);

  // A token that expires between two requests must not leave a stale user on
  // screen, so the client clears its session as soon as the API says 401.
  useEffect(() => {
    setUnauthorizedHandler(logout);

    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // The stored token is the only thing trusted across reloads; who it belongs
  // to is re-read from the API rather than from local storage.
  useEffect(() => {
    if (!readToken()) return;

    const controller = new AbortController();

    fetchCurrentUser(controller.signal)
      .then((current) => {
        setUser(current);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!controller.signal.aborted) logout();
      });

    return () => controller.abort();
  }, [logout]);

  const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    const response = await loginRequest(email, password);

    writeToken(response.token);
    setUser(response.user);
    setStatus('authenticated');

    return response.user;
  }, []);

  const register = useCallback(async (input: RegisterInput): Promise<AuthUser> => {
    const response = await registerRequest(input);

    writeToken(response.token);
    setUser(response.user);
    setStatus('authenticated');

    return response.user;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
