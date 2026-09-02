import { jest } from '@jest/globals';
import type { InternalAxiosRequestConfig } from 'axios';
import { clearToken, writeToken } from '../../src/services/auth-storage.js';
import { api } from '../../src/services/api.js';

/**
 * Overrides axios's own `adapter` (the function that would actually send
 * the request) to capture the fully-resolved config — including whatever
 * the request interceptor did to it — without needing a mocking library or
 * a real network call. A documented, public axios option, not a reach into
 * its internals.
 *
 * The captured request always ends up rejected (nothing genuinely answers
 * it), but *what* it rejects with isn't this test's concern — `api.ts`'s
 * own response interceptor normalises every failure into an `ApiError`
 * regardless of the original cause, so asserting on the rejection's
 * message would just be testing that normalisation, not the request
 * interceptor this test actually targets. Only the captured config matters
 * here.
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
    writeToken('abc123');
    const captured = captureRequestConfig();

    await expect(api.get('/whatever')).rejects.toThrow();

    expect(captured.config?.headers.get('Authorization')).toBe('Bearer abc123');
  });

  it('sends no Authorization header when there is no token', async () => {
    const captured = captureRequestConfig();

    await expect(api.get('/whatever')).rejects.toThrow();

    expect(captured.config?.headers.get('Authorization')).toBeFalsy();
  });
});
