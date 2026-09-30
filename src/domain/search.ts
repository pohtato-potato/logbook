import type { Entry, Person } from '../db/types';
import { entryLine, type Lookup } from './entryText';
import { searchFeelings, type Family, type Match } from '../vocab/vocab';

export type SearchResults = { lines: { day: string; text: string; id: number }[]; tags: string[]; people: Person[]; feelings: Match[] };
/* Search matches the same plain sentence each entry shows, so every kind is findable. #x is tags only, @x people only. */
export function searchAll(q: string, d: { entries: Entry[]; tags: string[]; people: Person[]; own: Record<string, Family>; lookup: Lookup; locked?: boolean }): SearchResults {
  const s = q.trim().toLowerCase(), none: SearchResults = { lines: [], tags: [], people: [], feelings: [] };
  if (!s) return none;
  if (s.startsWith('#')) return { ...none, tags: d.tags.filter(t => t.includes(s.slice(1))).slice(0, 8) };
  if (s.startsWith('@')) { const p = s.slice(1); return { ...none, people: d.people.filter(x => x.initial.toLowerCase() === p || x.name.toLowerCase().includes(p)).slice(0, 8) }; }
  const lines = d.entries.filter(e => !(d.locked && e.marks.priv)).map(e => ({ day: e.day, id: e.id!, text: entryLine(e, d.lookup), at: e.at })).filter(l => l.text.toLowerCase().includes(s))
    .sort((a, b) => b.day.localeCompare(a.day) || b.at - a.at).slice(0, 20).map(({ day, id, text }) => ({ day, id, text }));
  return { lines, tags: d.tags.filter(t => t.includes(s)).slice(0, 8), people: d.people.filter(x => x.name.toLowerCase().includes(s)).slice(0, 8), feelings: searchFeelings(s, d.own, 6) };
}
