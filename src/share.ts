/* Sharing in: another app sends a title, some text and maybe an address to the start page (the manifest's share_target).
   Nothing is fetched. The address is kept as text, and only http(s) addresses ever become links. */
export type Shared = { title: string; text: string; url: string };
const MAX = 2000;
export function safeUrl(u: string): string | null {
  try { const x = new URL(u.trim()); return x.protocol === 'http:' || x.protocol === 'https:' ? x.href : null; } catch { return null; }
}
export function readShare(search: string): Shared | null {
  const p = new URLSearchParams(search), cut = (s: string) => s.trim().slice(0, MAX);
  let title = p.get('title') ?? '', text = p.get('text') ?? '', url = p.get('url') ?? '';
  if (!url) { const m = text.match(/https?:\/\/\S+/); if (m) { url = m[0]; text = text.replace(m[0], '').replace(/\s{2,}/g, ' '); } }
  title = cut(title); text = cut(text); url = cut(url);
  return title || text || url ? { title, text, url } : null;
}
/* Run once before the app starts: keep what was shared for the sheet, then clean the address so a reload doesn't keep it twice. */
export function consumeShare() {
  if (typeof location === 'undefined' || !location.search) return;
  const s = readShare(location.search); if (!s) return;
  try { sessionStorage.setItem('logbook-share', JSON.stringify(s)); } catch { /* private mode: the sheet opens empty */ }
  history.replaceState(null, '', location.pathname + '#/share');
}
export function takeShare(): Shared | null {
  try { const s = sessionStorage.getItem('logbook-share'); return s ? (JSON.parse(s) as Shared) : null; } catch { return null; }
}
export function clearShare() { try { sessionStorage.removeItem('logbook-share'); } catch { /* nothing to clear */ } }
