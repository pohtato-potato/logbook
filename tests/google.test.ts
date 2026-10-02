import { describe, expect, it } from 'vitest';
import { authUrl, readTokenHash, usableToken, DRIVE_SCOPE, PHOTOS_SCOPE } from '../src/sources/google';

describe('Google sign-in', () => {
  it('asks Google for a short-lived token for just the scopes needed, returning to Logbook', () => {
    const u = new URL(authUrl('cid.apps.googleusercontent.com', [DRIVE_SCOPE], 'https://pohtato-potato.github.io/logbook/', 'st8'));
    expect(u.host).toBe('accounts.google.com');
    expect(Object.fromEntries(u.searchParams)).toMatchObject({ client_id: 'cid.apps.googleusercontent.com', response_type: 'token', redirect_uri: 'https://pohtato-potato.github.io/logbook/', state: 'st8', scope: DRIVE_SCOPE, include_granted_scopes: 'true' });
    expect(DRIVE_SCOPE).toBe('https://www.googleapis.com/auth/drive.file'); expect(PHOTOS_SCOPE).toBe('https://www.googleapis.com/auth/photospicker.mediaitems.readonly');
  });
  it('reads the token Google sends back, or the refusal', () => {
    expect(readTokenHash('#access_token=abc&expires_in=3599&state=st8&scope=a%20b&token_type=Bearer', 1000)).toEqual({ state: 'st8', token: 'abc', expiresAt: 1000 + 3599_000, scopes: ['a', 'b'] });
    expect(readTokenHash('#error=access_denied&state=st8', 0)).toEqual({ state: 'st8', error: 'access_denied' });
    expect(readTokenHash('#/today', 0)).toBeNull();
  });
  it('uses a kept token only while it is valid and covers the scopes', () => {
    const t = { token: 'abc', expiresAt: 100_000, scopes: [DRIVE_SCOPE] };
    expect(usableToken(t, [DRIVE_SCOPE], 10_000)).toBe('abc'); expect(usableToken(t, [DRIVE_SCOPE], 95_000)).toBeNull(); expect(usableToken(t, [PHOTOS_SCOPE], 10_000)).toBeNull(); expect(usableToken(null, [DRIVE_SCOPE], 0)).toBeNull();
  });
});
