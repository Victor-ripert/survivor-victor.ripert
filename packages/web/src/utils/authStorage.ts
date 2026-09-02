const TOKEN_STORAGE_KEY = 'profils-actifs:auth-token';

/**
 * Where the app keeps its JWT between page loads. `localStorage`, not a
 * cookie — this API is a plain stateless Bearer-token API (see CLAUDE.md's
 * Auth section) with no server-side session to piggyback a cookie on.
 *
 * Deliberately its own small module rather than something `api.ts` or
 * whichever page needs a token first just inlines — this issue exists
 * specifically so Domain A's still-unbuilt login page can call the exact
 * same `setToken`/`clearToken` this page reads from, instead of each
 * domain inventing its own storage and the two quietly disagreeing later.
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // Storage can legitimately fail (private-browsing quota limits, etc.).
    // The caller finds out the same way it would if the user had simply
    // never logged in — `getToken()` returns null on the next read either
    // way, so nothing needs to distinguish the two cases here.
  }
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}
