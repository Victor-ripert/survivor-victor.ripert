import { clearToken, getToken, setToken } from '../../src/utils/authStorage.js';

describe('authStorage', () => {
  afterEach(() => {
    clearToken();
  });

  it('returns null when no token has been stored', () => {
    expect(getToken()).toBeNull();
  });

  it('returns whatever token was set', () => {
    setToken('my-jwt');
    expect(getToken()).toBe('my-jwt');
  });

  it('returns null again after clearing', () => {
    setToken('my-jwt');
    clearToken();
    expect(getToken()).toBeNull();
  });

  it('persists across independent reads, not just in-memory', () => {
    setToken('token-a');
    setToken('token-b');
    expect(getToken()).toBe('token-b');
  });
});
