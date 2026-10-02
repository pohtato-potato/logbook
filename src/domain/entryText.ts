import type { Entry, Person, Place, Span } from '../db/types';
import { ratingText } from './rating';
import { feelingOf } from '../vocab/vocab';
import { parseDay } from './day';

/* What an entry points to, looked up once per screen. People are keyed by initial. */
/* Shown in place of a private entry's words while the lock is on. */
export const PRIVATE_TEXT = 'A private entry. Unlock to read.';
export type Lookup = { places: Map<number, Place>; spans: Map<number, Span>; people: Map<string, Person> };
export const EMPTY_LOOKUP: Lookup = { places: new Map(), spans: new Map(), people: new Map() };
/* :word codes become plain words, so text reads naturally without the app. Unknown :words stay as typed. */
export const plainWords = (t: string) => t.replace(/(^|\s):([\p{L}][\p{L}'-]*)/gu, (m, s: string, w: string) => (feelingOf(w, {}) ? s + w.replace(/-/g, ' ') : m));
export const personName = (lk: Lookup, i: string) => lk.people.get(i)?.name ?? `Friend ${i}`;
const list = (xs: string[]) => xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
const dm = (d: string) => parseDay(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
/* 6 to 10 November; 28 October to 2 November */
export const dateRange = (a: string, b: string) => { const x = dm(a), y = dm(b), [dx, mx] = x.split(' '), [dy, my] = y.split(' '); return a === b ? x : mx === my ? `${dx} to ${dy} ${my}` : `${x} to ${y}`; };
export const DOING = { Film: 'watching', Series: 'watching', Book: 'reading', Game: 'playing', Album: 'listening', Other: 'on it' } as const;
export const HOW_VERB = { 'In person': 'Saw', Call: 'Called', Messages: 'Messaged' } as const;
export const QUOTE_WHO = (lk: Lookup, who: string) => who === 'Overheard' ? 'overheard' : who === 'A book or film' ? 'from a book or film' : personName(lk, who);
export const hostOf = (u: string) => { try { return u ? new URL(u).host : ''; } catch { return ''; } };
export const minSec = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
/* One plain sentence for any entry: the same words on cards, in the Markdown export and in search. */
export function entryLine(e: Entry, lk: Lookup): string {
  if (e.marks.priv && e.text === PRIVATE_TEXT) return PRIVATE_TEXT; // masked while locked: no title, place, person or host either
  const d = e.data, text = plainWords(e.text).trim(), tail = text ? ' ' + text : '';
  if (!d) return text;
  switch (d.kind) {
    case 'media': return `${d.media}: ${d.title}, ${ratingText(d.rating)}.${tail}${d.current ? ` (Currently ${DOING[d.media]})` : ''}`;
    case 'quote': return `“${text}” (${QUOTE_WHO(lk, d.who)}${d.where ? `, ${d.where}` : ''})`;
    case 'place': { const p = lk.places.get(d.placeId); return p ? `Place: ${p.name}${d.first ? ' (a first)' : ''}.${tail}` : 'Place: a place that was removed.'; }
    case 'person': return `${HOW_VERB[d.how]} ${list(d.who.map(i => personName(lk, i)))}.${tail}`;
    case 'keep': return `Keepsake: ${text}.`;
    case 'voice': return `Voice note, ${minSec(d.seconds)}.${tail}`;
    case 'span': { const s = lk.spans.get(d.spanId); return s ? `Span: ${s.name}, ${dateRange(s.from, s.to)}.` : 'Span: a span that was removed.'; }
    case 'past': return `Written later: ${text}`;
    case 'link': return `Link: ${d.title || hostOf(d.url) || 'a shared link'}.${tail}`;
  }
}
