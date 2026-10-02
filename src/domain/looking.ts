import type { DayRow, Entry, Moment, Person, Span } from '../db/types';
import { FAMILIES, FAMILY_NAME, feelingOf, type Family } from '../vocab/vocab';
import { addDays } from './day';
import { PRIVATE_TEXT, dateRange, entryLine, type Lookup } from './entryText';
import type { Home } from './stamps';

/* Looking back, as plain numbers and sentences. Everything here describes; nothing ranks or judges. */
export type DayFams = Map<string, { family: Family; count: number }>;
const name = (f: Family) => FAMILY_NAME[f].toLowerCase();
const tally = <K,>(xs: K[]) => { const n = new Map<K, number>(); xs.forEach(x => n.set(x, (n.get(x) ?? 0) + 1)); return n; };
/* Most frequent first; ties keep the order of FAMILIES. */
const topFamilies = (fs: Family[], k: number) => { const n = tally(fs); return [...FAMILIES].filter(f => n.get(f)).sort((a, b) => n.get(b)! - n.get(a)!).slice(0, k); };
export { PRIVATE_TEXT };

/* The day overall, suggested from the most-felt family and its latest word, until it's set. */
export function suggestedOverall(moments: Moment[]) {
  if (!moments.length) return undefined;
  const n = tally(moments.map(m => m.family)), top = [...n.entries()].sort((a, b) => b[1] - a[1])[0][0], latest = [...moments].filter(m => m.family === top).sort((a, b) => b.at - a.at)[0];
  return { word: latest.word, family: top, strength: 3 };
}
/* Each day's family (the set overall, else the suggestion) and how many moments it had. */
export function dayFamilies(moments: Moment[], rows: DayRow[]): DayFams {
  const byDay = new Map<string, Moment[]>(); moments.forEach(m => byDay.set(m.day, [...(byDay.get(m.day) ?? []), m]));
  const out: DayFams = new Map();
  for (const d of new Set([...byDay.keys(), ...rows.filter(r => r.overall).map(r => r.day)])) {
    const ms = byDay.get(d) ?? [], fam = rows.find(r => r.day === d)?.overall?.family ?? suggestedOverall(ms)?.family;
    if (fam) out.set(d, { family: fam, count: ms.length });
  }
  return out;
}
/* Every day of a year, with its family and a 0–1 strength from how much was logged. */
export function yearDays(year: number, fams: DayFams): { day: string; family?: Family; v: number }[] {
  const out: { day: string; family?: Family; v: number }[] = [];
  for (let d = `${year}-01-01`; d.startsWith(String(year)); d = addDays(d, 1)) { const f = fams.get(d); out.push(f ? { day: d, family: f.family, v: Math.min(1, Math.max(0.2, f.count / 5)) } : { day: d, v: 0 }); }
  return out;
}
export function yearSummary(days: { day: string; family?: Family }[]): string {
  const year = days[0]?.day.slice(0, 4) ?? '', kept = days.filter(d => d.family);
  if (!kept.length) return `Nothing kept in ${year} yet.`;
  return `${kept.length} ${kept.length === 1 ? 'day' : 'days'} kept in ${year}, mostly ${name(topFamilies(kept.map(d => d.family!), 1)[0])}.`;
}
export function monthStats(month: string, moments: Moment[]) {
  const ms = moments.filter(m => m.day.startsWith(month)), n = tally(ms.map(m => m.family));
  const counts = Object.fromEntries(FAMILIES.map(f => [f, n.get(f) ?? 0])) as Record<Family, number>;
  return { counts, total: ms.length, top: topFamilies(ms.map(m => m.family), 2) };
}
export function monthSummary(s: { counts: Record<Family, number>; top: Family[] }): string {
  if (!s.top.length) return 'Nothing felt yet this month.';
  const [a, b] = s.top;
  return b && s.counts[b] * 2 >= s.counts[a] ? `Mostly ${name(a)} and ${name(b)} this month.` : `Mostly ${name(a)} this month.`;
}
/* The words reached for, including those after "then", most used first. */
export function wordCounts(moments: Moment[]): [string, { family: Family; n: number }][] {
  const c = new Map<string, { family: Family; n: number }>();
  const add = (w: string, fam: Family) => { const k = w.trim().toLowerCase(); if (!k) return; const x = c.get(k); c.set(k, { family: x?.family ?? fam, n: (x?.n ?? 0) + 1 }); };
  moments.forEach(m => { if (m.word === PRIVATE_FEELING) return; add(m.word, m.family); (m.about?.replace(/^then /, '').split(', ') ?? []).forEach(w => add(w, feelingOf(w, {})?.family ?? m.family)); });
  return [...c].sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0])).slice(0, 10);
}
/* The 24 clock hours (local time, 0–23), each with its feelings as shares of that hour. */
export type HourMix = { hour: number; count: number; parts: [Family, number][] }[];
export function hourMix(moments: Moment[]): HourMix {
  return Array.from({ length: 24 }, (_, hour) => {
    const ms = moments.filter(m => new Date(m.at).getHours() === hour), n = tally(ms.map(m => m.family));
    return { hour, count: ms.length, parts: [...n].sort((a, b) => b[1] - a[1]).map(([f, k]) => [f, k / ms.length] as [Family, number]) };
  });
}
const QUARTERS: [string, number[]][] = [['in the mornings', [6, 7, 8, 9, 10, 11]], ['in the afternoons', [12, 13, 14, 15, 16]], ['in the evenings', [17, 18, 19, 20, 21]], ['late at night', [22, 23, 0, 1, 2, 3, 4, 5]]];
export function hourSummary(mix: HourMix): string {
  const said = QUARTERS.flatMap(([words, hours]) => {
    const hs = mix.filter(h => hours.includes(h.hour)), total = hs.reduce((a, h) => a + h.count, 0); if (total < 3) return [];
    const w = new Map<Family, number>(); hs.forEach(h => h.parts.forEach(([f, share]) => w.set(f, (w.get(f) ?? 0) + share * h.count)));
    const top = [...FAMILIES].filter(f => w.get(f)).sort((a, b) => w.get(b)! - w.get(a)!)[0]; return [`${name(top)} ${words}`];
  });
  if (!said.length) return 'Too few moments yet to see a pattern through the day.';
  const s = said.join(', '); return s[0].toUpperCase() + s.slice(1) + '.';
}
/* For each tag on two or more days, the families most often on those days. */
export function oftenWith(entries: Entry[], fams: DayFams): { tag: string; families: Family[] }[] {
  const days = new Map<string, Set<string>>(); entries.forEach(e => e.tags.forEach(t => days.set(t, (days.get(t) ?? new Set()).add(e.day))));
  return [...days].filter(([, ds]) => ds.size >= 2).sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0])).slice(0, 5)
    .map(([tag, ds]) => ({ tag, families: topFamilies([...ds].flatMap(d => (fams.get(d) ? [fams.get(d)!.family] : [])), 2) })).filter(x => x.families.length);
}
export function peopleWith(entries: Entry[], fams: DayFams, people: Person[]): { person: Person; families: Family[] }[] {
  return people.map(p => { const ds = new Set(entries.filter(e => e.people.includes(p.initial)).map(e => e.day));
    return { person: p, days: ds.size, families: topFamilies([...ds].flatMap(d => (fams.get(d) ? [fams.get(d)!.family] : [])), 2) }; })
    .filter(x => x.days >= 2 && x.families.length).sort((a, b) => b.days - a.days).slice(0, 5).map(({ person, families }) => ({ person, families }));
}
export type LifeItem = { year: number; day: string; text: string; later: boolean; span?: Span; family?: Family };
/* Your life at a glance: things from before, firsts, trips and moves. "Don't bring back" stays out; private ones stay closed while locked. */
export function lifeItems(entries: Entry[], spans: Span[], homes: Home[], lookup: Lookup, locked: boolean, fams: DayFams = new Map()): LifeItem[] {
  const items: LifeItem[] = [];
  for (const e of entries) {
    if (e.marks.quiet || (e.kind !== 'past' && !e.marks.first)) continue;
    const text = e.marks.priv && locked ? PRIVATE_TEXT : entryLine(e, lookup).replace(/^Written later: /, '').replace(/ \(a first\)/, '');
    items.push({ year: Number(e.day.slice(0, 4)), day: e.day, text, later: e.kind === 'past', family: fams.get(e.day)?.family });
  }
  spans.forEach(s => items.push({ year: Number(s.from.slice(0, 4)), day: s.from, text: `${s.name}, ${dateRange(s.from, s.to)}`, later: false, span: s, family: s.family }));
  homes.forEach(h => items.push({ year: Number(h.from.slice(0, 4)), day: h.from, text: `Moved to ${h.name}`, later: false }));
  return items.sort((a, b) => b.day.localeCompare(a.day));
}
/* While locked, private entries keep their place (and dates, ratings, who) but none of their words, photos or sound. */
export function maskPrivate(entries: Entry[], locked: boolean): Entry[] {
  if (!locked) return entries;
  return entries.map(e => {
    if (!e.marks.priv) return e;
    const d = e.data, data: Entry['data'] = !d ? d : d.kind === 'media' ? { ...d, title: PRIVATE_TEXT } : d.kind === 'quote' ? { kind: 'quote', who: d.who } : d.kind === 'keep' ? { kind: 'keep' } : d.kind === 'voice' ? { ...d, audio: new Blob() } : d.kind === 'link' ? { kind: 'link', url: '' } : d.kind === 'person' ? { ...d, who: [] } : d;
    return { ...e, text: PRIVATE_TEXT, tags: [], people: [], data };
  });
}
/* While locked, private entries are left out of anything that counts or lists people, places or days. */
export const openTo = (entries: Entry[], locked: boolean) => (locked ? entries.filter(e => !e.marks.priv) : entries);
/* While locked, a feeling from a private line keeps its form (so the day's shape stays honest) but not its words. */
export const PRIVATE_FEELING = 'a private feeling';
export function maskMoments(moments: Moment[], entries: Entry[], locked: boolean): Moment[] {
  if (!locked) return moments;
  const hidden = new Set(entries.filter(e => e.marks.priv).map(e => e.id));
  return moments.map(m => { if (m.entryId == null || !hidden.has(m.entryId)) return m; const out = { ...m, word: PRIVATE_FEELING }; delete out.about; return out; });
}
/* While locked, a tag used only on private lines isn't listed anywhere. */
export function visibleTags(tags: string[], entries: Entry[], locked: boolean): string[] {
  if (!locked) return tags;
  const priv = new Set(entries.filter(e => e.marks.priv).flatMap(e => e.tags)), open = new Set(entries.filter(e => !e.marks.priv).flatMap(e => e.tags));
  return tags.filter(t => open.has(t) || !priv.has(t));
}
