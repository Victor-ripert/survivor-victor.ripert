import axios from 'axios';
import { getEnv } from '../utils/env.js';
import { getToken } from '../utils/authStorage.js';

const DEFAULT_BASE_URL = 'http://localhost:3000/api';

/**
 * The one axios instance every service function in
 * `packages/web/src/services` should call through, instead of each reaching
 * for `axios` directly — that's what makes the API's base URL, and now the
 * auth header below, a single place to change rather than a setting
 * repeated in every service file.
 *
 * Carries a request interceptor that attaches `Authorization: Bearer
 * <token>` whenever `authStorage.getToken()` returns one. Public endpoints
 * (the feed, a single profile) simply ignore a header they don't check, so
 * there's no need for a second, tokenless instance — every request goes
 * through this one, authenticated or not.
 */
export const api = axios.create({
  baseURL: getEnv('VITE_API_URL', DEFAULT_BASE_URL),
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});
