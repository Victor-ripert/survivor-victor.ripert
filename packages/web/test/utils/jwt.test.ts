import { decodeToken } from '../../src/utils/jwt.js';

function makeToken(payload: unknown): string {
  const base64url = (value: unknown): string =>
    Buffer.from(JSON.stringify(value))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${base64url({ alg: 'HS256' })}.${base64url(payload)}.fake-signature`;
}

describe('decodeToken', () => {
  it('decodes a well-formed token payload', () => {
    const token = makeToken({ id: 'user-1', email: 'admin@example.com', role: 'ADMIN' });

    expect(decodeToken(token)).toEqual({ id: 'user-1', email: 'admin@example.com', role: 'ADMIN' });
  });

  it('ignores extra claims like iat/exp that a real signed token carries', () => {
    const token = makeToken({
      id: 'user-1',
      email: 'admin@example.com',
      role: 'ADMIN',
      iat: 1234567890,
      exp: 1234599999,
    });

    expect(decodeToken(token)).toEqual({ id: 'user-1', email: 'admin@example.com', role: 'ADMIN' });
  });

  it('returns null for a string with the wrong number of segments', () => {
    expect(decodeToken('not-a-jwt')).toBeNull();
  });

  it('returns null when the payload segment is not valid base64/JSON', () => {
    expect(decodeToken('header.%%%not-base64%%%.signature')).toBeNull();
  });

  it('returns null when a required claim is missing', () => {
    const token = makeToken({ id: 'user-1', email: 'admin@example.com' });
    expect(decodeToken(token)).toBeNull();
  });

  it('returns null when a claim has the wrong type', () => {
    const token = makeToken({ id: 'user-1', email: 'admin@example.com', role: 42 });
    expect(decodeToken(token)).toBeNull();
  });
});
