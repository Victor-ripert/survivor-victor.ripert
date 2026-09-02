import axios from 'axios';
import { getEnv } from '../utils/env.js';

const DEFAULT_BASE_URL = 'http://localhost:3000/api';

/**
 * The one axios instance every service function in `packages/web/src/services`
 * should call through, instead of each reaching for `axios` directly —
 * that's what makes the API's base URL (and, later, shared request/response
 * interceptors like attaching the auth token) a single place to change
 * rather than a setting repeated in every service file.
 */
export const httpClient = axios.create({
  baseURL: getEnv('VITE_API_URL', DEFAULT_BASE_URL),
});
