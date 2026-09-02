import { clearToken, readToken, writeToken } from './auth-storage.js';

describe('auth-storage', () => {
  afterEach(() => {
    clearToken();
  });

  it('returns null when no token has been stored', () => {
    expect(readToken()).toBeNull();
  });

  it('returns whatever token was written', () => {
    writeToken('a-jwt');
    expect(readToken()).toBe('a-jwt');
  });

  it('returns null again after clearing', () => {
    writeToken('a-jwt');
    clearToken();
    expect(readToken()).toBeNull();
  });

  it('overwrites a previously stored token', () => {
    writeToken('token-a');
    writeToken('token-b');
    expect(readToken()).toBe('token-b');
  });
});
