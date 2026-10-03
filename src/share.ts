import { putCards, type LogbookShare } from './shelf/shelf';
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
  if (!url) { const m = text.match(/https?:\/\/\S+/); if (m) { url = m[0].replace(/[).,;:!?'"’”\]]+$/, ''); text = text.replace(url, '').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' '); } }
  title = cut(title); text = cut(text); url = cut(url);
  return title || text || url ? { title, text, url } : null;
}
/* What keeping a share makes: an entry (a link or a quote), or, for something watched, a hand-off to Media (films, books and shows live there now). No word is dropped. */
export type ShareKeep = { kind: 'link'; text: string; data: { kind: 'link'; url: string; title?: string } } | { kind: 'quote'; text: string; data: { kind: 'quote'; who: 'A book or film'; where?: string } } | { toMedia: LogbookShare };
export function shareToEntry(s: Shared, as: 'watched' | 'link' | 'quote', line: string): ShareKeep {
  const own = line.trim(), safe = safeUrl(s.url);
  if (as === 'watched') return { toMedia: { title: (s.title || (own ? s.text : '')).slice(0, 2000), text: own || s.text, url: safeUrl(s.url) ?? '' } };
  if (as === 'quote') return { kind: 'quote', text: s.text, data: { kind: 'quote', who: 'A book or film', ...(own ? { where: own } : {}) } };
  const title = (s.title || s.text || (safe ? '' : s.url)).slice(0, 200);
  return { kind: 'link', text: own, data: { kind: 'link', url: safe ?? '', ...(title ? { title } : {}) } };
}
/* "Watched": the share is left on the shelf for Media (a logbook.share card), and Media opens at its share screen. */
export async function handToMedia(s: Shared, line: string, idb?: IDBFactory, now = Date.now()): Promise<string> {
  const k = shareToEntry(s, 'watched', line);
  if (!('toMedia' in k)) return '../media/';
  await putCards([{ id: `logbook.share:${now}`, format: 'logbook.share', version: 1, from: 'logbook', to: 'media', about: {}, writtenAt: now, data: k.toMedia }], idb);
  return '../media/';
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
