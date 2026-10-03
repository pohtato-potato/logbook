import { useSyncExternalStore } from 'react';
export const FORM_KINDS = ['photo', 'quote', 'place', 'person', 'keep', 'voice', 'span', 'past'] as const;
export type FormKind = (typeof FORM_KINDS)[number];
export const SHELF_IDS = ['firsts', 'quotes', 'places', 'keeps', 'bdays', 'songs', 'spans'] as const;
export type ShelfId = (typeof SHELF_IDS)[number];
export const CAL_TABS = ['days', 'gallery', 'year', 'life', 'feelings'] as const;
export type CalTab = (typeof CAL_TABS)[number];
export const ALM_TABS = ['report', 'headlines', 'wrapped', 'random'] as const;
export type AlmTab = (typeof ALM_TABS)[number];
export type Route = { name: 'today' } | { name: 'cal'; month?: string; tab?: CalTab } | { name: 'day'; day: string } | { name: 'feel'; when: 'now' | 'day'; word?: string } | { name: 'settings' } | { name: 'first-run' }
  | { name: 'add' } | { name: 'form'; kind: FormKind } | { name: 'shelves' } | { name: 'shelf'; shelf: ShelfId } | { name: 'person'; id: string } | { name: 'tag'; tag: string } | { name: 'search' } | { name: 'almanac'; tab?: AlmTab } | { name: 'share' };
const has = <T extends string>(xs: readonly T[], x: string | undefined): x is T => !!x && (xs as readonly string[]).includes(x);
export function parseRoute(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?'), p = new URLSearchParams(query), [a, b] = path.split('/');
  const arg = b ? (() => { try { return decodeURIComponent(b); } catch { return b; } })() : undefined;
  if (a === 'cal') { const t = p.get('tab') ?? undefined, r: Route = b ? { name: 'cal', month: b } : { name: 'cal' }; return has(CAL_TABS, t) && t !== 'days' ? { ...r, tab: t } : r; }
  if (a === 'day' && /^\d{4}-\d{2}-\d{2}$/.test(b ?? '')) return { name: 'day', day: b };
  if (a === 'feel') { const r: Route = { name: 'feel', when: p.get('when') === 'day' ? 'day' : 'now' }; const w = p.get('word'); return w ? { ...r, word: w } : r; }
  if (a === 'settings' || a === 'first-run' || a === 'add' || a === 'shelves' || a === 'search' || a === 'share') return { name: a };
  if (a === 'almanac') { const t = p.get('tab') ?? undefined; return has(ALM_TABS, t) && t !== 'report' ? { name: 'almanac', tab: t } : { name: 'almanac' }; }
  if (a === 'form' && has(FORM_KINDS, b)) return { name: 'form', kind: b };
  if (a === 'shelf' && has(SHELF_IDS, b)) return { name: 'shelf', shelf: b };
  if (a === 'person' && arg) return { name: 'person', id: arg };
  if (a === 'tag' && arg) return { name: 'tag', tag: arg };
  return { name: 'today' };
}
export function routeHash(r: Route): string {
  switch (r.name) {
    case 'cal': return `${r.month ? `#/cal/${r.month}` : '#/cal'}${r.tab && r.tab !== 'days' ? `?tab=${r.tab}` : ''}`;
    case 'day': return `#/day/${r.day}`;
    case 'feel': return `#/feel?when=${r.when}${r.word ? `&word=${encodeURIComponent(r.word)}` : ''}`;
    case 'form': return `#/form/${r.kind}`;
    case 'almanac': return `#/almanac${r.tab && r.tab !== 'report' ? `?tab=${r.tab}` : ''}`;
    case 'shelf': return `#/shelf/${r.shelf}`;
    case 'person': return `#/person/${encodeURIComponent(r.id)}`;
    case 'tag': return `#/tag/${encodeURIComponent(r.tag)}`;
    default: return `#/${r.name}`;
  }
}
const sub = (cb: () => void) => { addEventListener('hashchange', cb); return () => removeEventListener('hashchange', cb); };
export const useRoute = () => parseRoute(useSyncExternalStore(sub, () => location.hash, () => '#/today'));
export const go = (r: Route) => { location.hash = routeHash(r); };
