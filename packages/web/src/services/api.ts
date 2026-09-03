import axios, { AxiosError } from 'axios';
import type { ApiErrorCode, ApiErrorResponse } from '@profils-actifs/shared';
import { getEnv } from '../utils/env.js';
import { clearToken, readToken } from './auth-storage.js';

/** A request that has not answered by now is not going to: without a ceiling a
 *  dropped connection leaves a spinner turning for as long as the tab is open. */
const REQUEST_TIMEOUT_MS = 15_000;

// `getEnv` (not a bare `import.meta.env.VITE_API_URL ?? ...`) because
// `import.meta.env` is a Vite-only feature: under Jest, this module is
// imported by virtually every service-layer test, so a bare read that
// throws when `import.meta.env` itself is absent at runtime would take
// down the whole suite rather than just this one file.
export const api = axios.create({
  baseURL: getEnv('VITE_API_URL', 'http://localhost:3000/api'),
  timeout: REQUEST_TIMEOUT_MS,
});

api.interceptors.request.use((config) => {
  const token = readToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Normalised failure: the UI branches on `code`, never on a message string. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const isApiErrorResponse = (value: unknown): value is ApiErrorResponse =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as ApiErrorResponse).error === 'string' &&
  typeof (value as ApiErrorResponse).message === 'string';

export const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;

  if (error instanceof AxiosError) {
    const body: unknown = error.response?.data;

    if (isApiErrorResponse(body)) {
      return new ApiError(error.response?.status ?? 500, body.error, body.message);
    }

    // Our own AbortController firing — a superseded request, not a failure.
    // Callers drop it (see `useAsyncResource`), but it still needs a shape.
    if (error.code === 'ERR_CANCELED') {
      return new ApiError(0, 'internal_error', 'Requête annulée.');
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError(
        0,
        'service_unavailable',
        'Le serveur met trop de temps à répondre. Réessayez dans un instant.',
      );
    }

    if (!error.response) {
      return new ApiError(
        0,
        'internal_error',
        "Le serveur est injoignable. Vérifiez que l'API est démarrée.",
      );
    }
  }

  return new ApiError(500, 'internal_error', 'Une erreur inattendue est survenue.');
};

let onUnauthorized: (() => void) | null = null;

/** Lets the auth context clear its state when a token expires mid-session;
 *  the interceptor lives outside React and cannot navigate on its own. */
export const setUnauthorizedHandler = (handler: (() => void) | null): void => {
  onUnauthorized = handler;
};

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error);

    if (apiError.status === 401) {
      clearToken();
      onUnauthorized?.();
    }

    return Promise.reject(apiError);
  },
);
