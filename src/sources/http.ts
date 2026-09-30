export class OfflineError extends Error { constructor() { super('Waiting for a connection. Nothing is lost.'); this.name = 'OfflineError'; } }
export type FetchJson = (url: string, init?: RequestInit) => Promise<unknown>;
/* The one place Logbook reaches outside. Any failure (offline, slow, an error page) becomes the same calm OfflineError. */
export const fetchJson: FetchJson = async (url, init) => {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), 12_000);
  try { const r = await fetch(url, { referrerPolicy: 'no-referrer', ...init, signal: ac.signal }); if (!r.ok) throw new OfflineError(); return await r.json(); }
  catch { throw new OfflineError(); } finally { clearTimeout(t); }
};
