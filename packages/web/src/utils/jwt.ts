import type { UserRole } from '@profils-actifs/shared';

export interface DecodedToken {
  id: string;
  email: string;
  role: UserRole;
}

function base64UrlDecode(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return atob(padded);
}

/**
 * Reads a JWT's payload (the middle of its three dot-separated,
 * base64url-encoded segments) without verifying its signature.
 *
 * This is NOT a security check, and can't be one: verifying a token
 * requires the API's secret signing key, which must never exist in
 * browser code (see `packages/api/src/services/jwt.ts` — that's where
 * verification actually happens). This only reads what a *legitimate*
 * token from this app would contain, purely so the UI can decide what to
 * show — e.g. `ModerationQueuePage` gating itself to `role === 'ADMIN'` —
 * before a request even reaches the API. The API's own `requireRole`
 * middleware remains the actual authority; a forged or tampered token
 * would still be rejected there regardless of what this function returns.
 * Returns `null` for anything that isn't a well-formed token, rather than
 * throwing, so a caller can treat "malformed" the same as "not logged in."
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(payloadSegment)) as Partial<DecodedToken>;
    if (
      typeof payload.id !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return null;
    }

    return { id: payload.id, email: payload.email, role: payload.role as UserRole };
  } catch {
    return null;
  }
}
