import { signOut } from './google';
export class OfflineError extends Error { constructor() { super('Waiting for a connection. Nothing is lost.'); this.name = 'OfflineError'; } }
export type FetchJson = (url: string, init?: RequestInit) => Promise<unknown>;
/* The one place Logbook reaches outside. Any failure (offline, slow, an error page) becomes the same calm OfflineError. */
export const fetchJson: FetchJson = async (url, init) => {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), 12_000);
  try { const r = await fetch(url, { referrerPolicy: 'no-referrer', ...init, signal: ac.signal }); if (!r.ok) throw new OfflineError(); return await r.json(); }
  catch { throw new OfflineError(); } finally { clearTimeout(t); }
};
export class SignedOutError extends Error { constructor() { super('Signed out of Google. Sign in again to carry on; nothing is lost.'); this.name = 'PlainMessage'; } }
const plain = (m: string) => Object.assign(new Error(m), { name: 'PlainMessage' });
/* What Google's refusal means, in plain words: a full Drive, a request to slow down, or a token that no longer works. */
export function googleError(status: number, body: unknown): Error {
  const e = (body as { error?: { status?: string; errors?: { reason?: string }[] } } | null)?.error, reason = `${e?.errors?.[0]?.reason ?? ''} ${e?.status ?? ''}`;
  if (status === 401) return new SignedOutError();
  if (/storageQuotaExceeded/i.test(reason)) return plain('Your Google Drive is full, so nothing more could be put there. Nothing on the phone changed.');
  if (status === 429 || /rate|limit|quota|exhausted/i.test(reason)) return plain('Google asked Logbook to slow down. Try again in a few minutes; nothing is lost.');
  if (status === 403) return new SignedOutError();
  return new OfflineError();
}
export type AuthCall = (url: string, init?: RequestInit) => Promise<unknown>;
export type AuthSend = (url: string, init?: RequestInit) => Promise<Response>;
const SLOW = 'The connection was too slow, so it stopped. Nothing on the phone changed; try again on Wi‑Fi.';
/* A signed-in request to Google (Drive, Photos). Any answer Google gives in the 200s or 300s comes back as is; a refusal becomes googleError,
   and a refused token is forgotten so the next sign-in really asks Google. Never reaches any other host. */
export const authSend = (token: string, forget: () => void = signOut, ms = 60_000): AuthSend => async (url, init) => {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { referrerPolicy: 'no-referrer', ...init, headers: { ...(init?.headers as Record<string, string>), Authorization: `Bearer ${token}` }, signal: ac.signal });
    if (r.status >= 400) { const err = googleError(r.status, await r.json().catch(() => null)); if (err instanceof SignedOutError) forget(); throw err; }
    return r;
  } catch (e) { if ((e as Error).name === 'PlainMessage' || e instanceof OfflineError) throw e; throw ac.signal.aborted ? plain(SLOW) : new OfflineError(); } finally { clearTimeout(t); }
};
export const authCall = (token: string, forget: () => void = signOut): AuthCall => { const send = authSend(token, forget);
  return async (url, init) => { const r = await send(url, init); if (!r.ok) throw new OfflineError(); return (r.headers.get('content-type') ?? '').includes('json') ? await r.json() : await r.blob(); }; };
