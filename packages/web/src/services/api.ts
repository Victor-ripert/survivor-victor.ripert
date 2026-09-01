import axios, { AxiosError } from 'axios';
import type { ApiErrorCode, ApiErrorResponse } from '@profils-actifs/shared';
import { clearToken, readToken } from './auth-storage.js';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export const api = axios.create({ baseURL: BASE_URL });

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
