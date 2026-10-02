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
/* What keeping a share makes: an entry (a link or a quote), or a film form filled in with the title and the owner's line. No word is dropped. */
export type ShareKeep = { kind: 'link'; text: string; data: { kind: 'link'; url: string; title?: string } } | { kind: 'quote'; text: string; data: { kind: 'quote'; who: 'A book or film'; where?: string } } | { media: { title: string; note: string } };
export function shareToEntry(s: Shared, as: 'watched' | 'link' | 'quote', line: string): ShareKeep {
  const own = line.trim(), safe = safeUrl(s.url);
  if (as === 'watched') return { media: { title: (s.title || s.text).slice(0, 120), note: own } };
  if (as === 'quote') return { kind: 'quote', text: s.text, data: { kind: 'quote', who: 'A book or film', ...(own ? { where: own } : {}) } };
  const title = (s.title || s.text || (safe ? '' : s.url)).slice(0, 200);
  return { kind: 'link', text: own, data: { kind: 'link', url: safe ?? '', ...(title ? { title } : {}) } };
}
/* The film form's prefill, from a share: read on the form's first render, cleared once it has shown. */
const PREFILL = 'logbook-media-prefill';
export const setMediaPrefill = (p: { title: string; note: string }) => { try { sessionStorage.setItem(PREFILL, JSON.stringify(p)); } catch { /* the form just starts empty */ } };
export const peekMediaPrefill = (): { title: string; note: string } => { try { const s = sessionStorage.getItem(PREFILL); return s ? JSON.parse(s) : { title: '', note: '' }; } catch { return { title: '', note: '' }; } };
export const clearMediaPrefill = () => { try { sessionStorage.removeItem(PREFILL); } catch { /* nothing kept */ } };
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
