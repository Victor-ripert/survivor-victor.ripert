import { jest } from '@jest/globals';
import type { InternalAxiosRequestConfig } from 'axios';
import { clearToken, setToken } from '../../src/utils/authStorage.js';
import { api } from '../../src/services/api.js';

/**
 * Overrides axios's own `adapter` (the function that would actually send
 * the request) to capture the fully-resolved config — including whatever
 * the request interceptor did to it — without needing a mocking library or
 * a real network call. A documented, public axios option, not a reach into
 * its internals.
 */
function captureRequestConfig(): { config: InternalAxiosRequestConfig | undefined } {
  const captured: { config: InternalAxiosRequestConfig | undefined } = { config: undefined };
  api.defaults.adapter = (config: InternalAxiosRequestConfig) => {
    captured.config = config;
    return Promise.reject(new Error('short-circuit: no real request sent'));
  };
  return captured;
}

describe('api request interceptor', () => {
  afterEach(() => {
    clearToken();
    jest.restoreAllMocks();
  });

  it('attaches Authorization: Bearer <token> when a token is stored', async () => {
    setToken('abc123');
    const captured = captureRequestConfig();

    await expect(api.get('/whatever')).rejects.toThrow('short-circuit');

    expect(captured.config?.headers.get('Authorization')).toBe('Bearer abc123');
  });

  it('sends no Authorization header when there is no token', async () => {
    const captured = captureRequestConfig();

    await expect(api.get('/whatever')).rejects.toThrow('short-circuit');

    expect(captured.config?.headers.get('Authorization')).toBeFalsy();
  });
});
