/* Signing in to Google, without loading any Google script: Logbook sends the owner to Google's own sign-in page in a small window,
   Google sends them back to Logbook's own address with a short-lived token (about an hour), and that window hands the token over and closes.
   The token stays in this tab's session storage only; Logbook never sees a password. The client ID comes from the private starter file. */
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const PHOTOS_SCOPE = 'https://www.googleapis.com/auth/photospicker.mediaitems.readonly';
const KEY = 'logbook-google', CHANNEL = 'logbook-auth';
export type Kept = { token: string; expiresAt: number; scopes: string[] };
export function authUrl(clientId: string, scopes: string[], redirect: string, state: string): string {
  return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({ client_id: clientId, redirect_uri: redirect, response_type: 'token', scope: scopes.join(' '), include_granted_scopes: 'true', state })}`;
}
export function readTokenHash(hash: string, now = Date.now()): { state: string; token: string; expiresAt: number; scopes: string[] } | { state: string; error: string } | null {
  const h = hash.replace(/^#/, ''); if (!/(^|&)(access_token|error)=/.test(h)) return null;
  const p = new URLSearchParams(h), state = p.get('state') ?? '';
  if (p.get('error')) return { state, error: p.get('error')! };
  return { state, token: p.get('access_token')!, expiresAt: now + Number(p.get('expires_in') ?? 0) * 1000, scopes: (p.get('scope') ?? '').split(' ').filter(Boolean) };
}
/* A kept token is used only with a minute to spare and only for the scopes it was given. */
export function usableToken(k: Kept | null, scopes: string[], now = Date.now()): string | null {
  return k && k.expiresAt - 60_000 > now && scopes.every(s => k.scopes.includes(s)) ? k.token : null;
}
const load = (): Kept | null => { try { const s = sessionStorage.getItem(KEY); return s ? (JSON.parse(s) as Kept) : null; } catch { return null; } };
const keep = (k: Kept) => { try { const cur = load(); sessionStorage.setItem(KEY, JSON.stringify({ ...k, scopes: [...new Set([...(cur && cur.expiresAt > Date.now() ? cur.scopes : []), ...k.scopes])] })); } catch { /* the next action asks again */ } };
export const token = (scopes: string[]) => usableToken(load(), scopes);
export const signOut = () => { try { sessionStorage.removeItem(KEY); } catch { /* nothing kept */ } };
const redirectUri = () => location.origin + location.pathname;
/* Run once at start: if this page is Google sending the owner back, hand the token to the waiting Logbook window and close. */
export function handleAuthReturn(): boolean {
  if (typeof location === 'undefined') return false;
  const r = readTokenHash(location.hash); if (!r) return false;
  try { new BroadcastChannel(CHANNEL).postMessage(r); } catch { /* old browser: fall back below */ }
  if ('token' in r) keep({ token: r.token, expiresAt: r.expiresAt, scopes: r.scopes });
  history.replaceState(null, '', location.pathname + '#/settings');
  if (window.opener) window.close();
  return true;
}
/* Opens Google's sign-in and waits for the token (up to three minutes). Null when the owner cancelled or closed the window. */
export function signIn(clientId: string, scopes: string[]): Promise<string | null> {
  const have = token(scopes); if (have) return Promise.resolve(have);
  const state = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');
  const url = authUrl(clientId, scopes, redirectUri(), state);
  return new Promise(resolve => {
    const ch = new BroadcastChannel(CHANNEL); let done = false;
    const finish = (t: string | null) => { if (done) return; done = true; ch.close(); clearInterval(watch); clearTimeout(limit); resolve(t); };
    ch.onmessage = e => { const r = e.data as ReturnType<typeof readTokenHash>; if (!r || r.state !== state) return; if ('token' in r) { keep({ token: r.token, expiresAt: r.expiresAt, scopes: r.scopes }); finish(r.token); } else finish(null); };
    const w = window.open(url, 'logbook-google', 'popup,width=480,height=680');
    if (!w) { location.assign(url); return; } // pop-ups blocked: go there in this window; Logbook comes back to Settings signed in
    const watch = window.setInterval(() => { if (w.closed) setTimeout(() => finish(token(scopes)), 400); }, 700);
    const limit = window.setTimeout(() => finish(null), 3 * 60_000);
  });
}
