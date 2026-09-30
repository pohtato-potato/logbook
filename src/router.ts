import { useSyncExternalStore } from 'react';
export type Route = { name: 'today' } | { name: 'cal'; month?: string } | { name: 'day'; day: string } | { name: 'feel'; when: 'now' | 'day'; word?: string } | { name: 'settings' } | { name: 'first-run' };
export function parseRoute(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?'), p = new URLSearchParams(query), [a, b] = path.split('/');
  if (a === 'cal') return b ? { name: 'cal', month: b } : { name: 'cal' };
  if (a === 'day' && /^\d{4}-\d{2}-\d{2}$/.test(b ?? '')) return { name: 'day', day: b };
  if (a === 'feel') { const r: Route = { name: 'feel', when: p.get('when') === 'day' ? 'day' : 'now' }; const w = p.get('word'); return w ? { ...r, word: w } : r; }
  if (a === 'settings') return { name: 'settings' };
  if (a === 'first-run') return { name: 'first-run' };
  return { name: 'today' };
}
export function routeHash(r: Route): string {
  if (r.name === 'cal') return r.month ? `#/cal/${r.month}` : '#/cal';
  if (r.name === 'day') return `#/day/${r.day}`;
  if (r.name === 'feel') return `#/feel?when=${r.when}${r.word ? `&word=${encodeURIComponent(r.word)}` : ''}`;
  return `#/${r.name}`;
}
const sub = (cb: () => void) => { addEventListener('hashchange', cb); return () => removeEventListener('hashchange', cb); };
export const useRoute = () => parseRoute(useSyncExternalStore(sub, () => location.hash, () => '#/today'));
export const go = (r: Route) => { location.hash = routeHash(r); };
