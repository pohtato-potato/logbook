export class OfflineError extends Error { constructor() { super('Waiting for a connection. Nothing is lost.'); this.name = 'OfflineError'; } }
export type FetchJson = (url: string, init?: RequestInit) => Promise<unknown>;
/* The one place Logbook reaches outside. Any failure (offline, slow, an error page) becomes the same calm OfflineError. */
export const fetchJson: FetchJson = async (url, init) => {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), 12_000);
  try { const r = await fetch(url, { referrerPolicy: 'no-referrer', ...init, signal: ac.signal }); if (!r.ok) throw new OfflineError(); return await r.json(); }
  catch { throw new OfflineError(); } finally { clearTimeout(t); }
};
export class SignedOutError extends Error { constructor() { super('Signed out of Google. Sign in again to carry on; nothing is lost.'); this.name = 'PlainMessage'; } }
export type AuthCall = (url: string, init?: RequestInit) => Promise<unknown>;
/* A signed-in call to Google (Drive, Photos). A refused token is SignedOutError; anything else is OfflineError. Never reaches any other host. */
export const authCall = (token: string): AuthCall => async (url, init) => {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), 60_000);
  try {
    const r = await fetch(url, { referrerPolicy: 'no-referrer', ...init, headers: { ...(init?.headers as Record<string, string>), Authorization: `Bearer ${token}` }, signal: ac.signal });
    if (r.status === 401 || r.status === 403) throw new SignedOutError();
    if (!r.ok) throw new OfflineError();
    return (r.headers.get('content-type') ?? '').includes('json') ? await r.json() : await r.blob();
  } catch (e) { if (e instanceof SignedOutError) throw e; throw new OfflineError(); } finally { clearTimeout(t); }
};
