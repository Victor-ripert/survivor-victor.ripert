const TOKEN_KEY = 'profils-actifs.token';

/** Private browsing and storage-blocking settings make localStorage throw
 *  rather than return null, so every access is guarded. */
export const readToken = (): string | null => {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const writeToken = (token: string): void => {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // A session that cannot persist its token still works until reload.
  }
};

export const clearToken = (): void => {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
};
