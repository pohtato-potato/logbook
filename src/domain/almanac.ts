import type { DayRow, Entry, Moment, Person, Place } from '../db/types';
import { FAMILIES, FAMILY_NAME, type Family } from '../vocab/vocab';
import { addDays, parseDay, weekStartOf } from './day';
import { EMPTY_LOOKUP, entryLine } from './entryText';
import { wordCounts } from './looking';

/* The Almanac's words and numbers. It describes what was; it never ranks, judges or predicts. Callers pass entries and moments already masked for privacy. */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const lower = (f: Family) => FAMILY_NAME[f].toLowerCase();
const count = <K,>(xs: K[]) => { const n = new Map<K, number>(); xs.forEach(x => n.set(x, (n.get(x) ?? 0) + 1)); return n; };
const top = <K,>(xs: K[], k = 1) => [...count(xs)].sort((a, b) => b[1] - a[1]).slice(0, k);
const topFams = (fs: Family[], k: number) => { const n = count(fs); return [...FAMILIES].filter(f => n.get(f)).sort((a, b) => n.get(b)! - n.get(a)!).slice(0, k); };
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const dm = (d: string) => parseDay(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
const quietIds = (entries: Entry[]) => new Set(entries.filter(e => e.marks.quiet).map(e => e.id));

export type Report = { headline: string; numbers: { n: number; label: string; sub: string }[]; notable: { n: string; text: string; first?: boolean }[] };
export function yearReport(year: number, d: { entries: Entry[]; moments: Moment[]; rows: DayRow[]; places: Place[]; people: Person[] }): Report {
  const y = String(year), ms = d.moments.filter(m => m.day.startsWith(y)), es = d.entries.filter(e => e.day.startsWith(y));
  if (!ms.length && !es.length) return { headline: 'Nothing kept this year yet.', numbers: [], notable: [] };
  const fams = topFams(ms.map(m => m.family), 2);
  const peak = (f: Family) => MONTHS[Number(top(ms.filter(m => m.family === f).map(m => m.day.slice(5, 7)))[0][0]) - 1];
  const headline = fams.length > 1 ? `A ${lower(fams[0])} year, with ${lower(fams[1])} in ${peak(fams[1])}.` : fams.length ? `A ${lower(fams[0])} year so far.` : 'A year of lines so far.';
  const numbers: Report['numbers'] = [];
  if (ms.length) numbers.push({ n: ms.length, label: 'feelings named', sub: plural(new Set(ms.map(m => m.family)).size, 'family', 'families') });
  const days = new Set([...ms.map(m => m.day), ...es.map(e => e.day)]);
  numbers.push({ n: days.size, label: days.size === 1 ? 'day kept' : 'days kept', sub: plural(ms.length, 'moment') });
  const visits = es.filter(e => e.data?.kind === 'place'), placeIds = new Set(visits.map(e => (e.data as { placeId: number }).placeId));
  if (placeIds.size) { const firsts = visits.filter(e => (e.data as { first: boolean }).first).length; numbers.push({ n: placeIds.size, label: placeIds.size === 1 ? 'place' : 'places', sub: firsts ? `${firsts} ${firsts === 1 ? 'was a first' : 'were firsts'}` : 'all ones you knew' }); }
  const who = es.flatMap(e => e.people.map(p => ({ p, day: e.day }))), initials = new Set(who.map(w => w.p));
  if (initials.size) {
    const [bestP] = top([...new Set(who.map(w => `${w.p}|${w.day}`))].map(k => k.split('|')[0]))[0], theirDays = [...new Set(who.filter(w => w.p === bestP).map(w => w.day))];
    const name = d.people.find(p => p.initial === bestP)?.name ?? bestP, wd = top(theirDays.map(x => parseDay(x).getDay()))[0][0];
    numbers.push({ n: initials.size, label: initials.size === 1 ? 'person' : 'people', sub: theirDays.length >= 3 ? `${name} turns up most on ${WEEKDAYS[wd]}s` : plural(theirDays.length, 'day') + ` with ${name}` });
  }
  const notable: Report['notable'] = [];
  if (fams.length) {
    const byMonth = top([...new Set(ms.filter(m => m.family === fams[0]).map(m => m.day))].map(x => x.slice(5, 7)))[0];
    if (byMonth && byMonth[1] >= 3) notable.push({ n: String(byMonth[1]), text: `${lower(fams[0])} days in ${MONTHS[Number(byMonth[0]) - 1]}, more than any other month` });
  }
  const [word] = wordCounts(ms);
  if (word && word[1].n >= 2) notable.push({ n: String(word[1].n), text: `times you named ${word[0]}, more than any other word` });
  const first = [...es].filter(e => e.marks.first && !e.marks.quiet).sort((a, b) => b.day.localeCompare(a.day) || b.at - a.at)[0];
  if (first) notable.push({ n: '', first: true, text: `the day you marked to keep: ${dm(first.day)}, ${entryLine(first, EMPTY_LOOKUP).replace(/\.$/, '')}` });
  return { headline, numbers, notable };
}
/* Weeks run Monday to Sunday; a late-night line already belongs to the day before (the 4 am rule). */
export function weekOf(day: string) { const start = weekStartOf(day); return { start, end: addDays(start, 6) }; }
export function weekLineSuggestion(entries: Entry[], moments: Moment[], week: { start: string; end: string }): string {
  const inWeek = <T extends { day: string }>(xs: T[]) => xs.filter(x => x.day >= week.start && x.day <= week.end);
  const es = inWeek(entries).filter(e => !e.marks.quiet), ms = inWeek(moments);
  if (!es.length && !ms.length) return 'A quiet week.';
  const fam = topFams(ms.map(m => m.family), 1)[0], tag = top(es.flatMap(e => e.tags))[0]?.[0], who = top(es.flatMap(e => e.people))[0]?.[0];
  const withs = [tag && `#${tag}`, who].filter(Boolean).join(' and ');
  return `${fam ? `Mostly ${lower(fam)}` : plural(new Set(es.map(e => e.day)).size, 'day') + ' kept'}${withs ? `, with ${withs}` : ''}.`;
}
export function monthLines(year: number, entries: Entry[], moments: Moment[], today: string): { month: string; family?: Family; line: string }[] {
  const last = Number(today.slice(0, 4)) === year ? Number(today.slice(5, 7)) : 12, out: { month: string; family?: Family; line: string }[] = [];
  for (let mo = last; mo >= 1; mo--) {
    const key = `${year}-${String(mo).padStart(2, '0')}`, ms = moments.filter(m => m.day.startsWith(key)), es = entries.filter(e => e.day.startsWith(key));
    if (!ms.length && !es.length) { out.push({ month: MONTHS[mo - 1], line: 'Nothing kept.' }); continue; }
    const fam = topFams(ms.map(m => m.family), 1)[0], firsts = es.filter(e => e.marks.first).length, tag = top(es.flatMap(e => e.tags))[0]?.[0];
    const extra = [firsts && plural(firsts, 'first'), tag && `#${tag} most`].filter(Boolean).join(', ');
    out.push({ month: MONTHS[mo - 1], family: fam, line: `${fam ? `Mostly ${lower(fam)}.` : 'Lines kept, no feelings named.'}${extra ? ` ${extra}.` : ''}` });
  }
  return out;
}
/* On this day, in earlier years: one entry a year (its first), newest year first. "Don't bring back" stays out. */
export function onThisDay(entries: Entry[], today: string): { year: number; entry: Entry }[] {
  const md = today.slice(5), y = Number(today.slice(0, 4)), by = new Map<number, Entry>();
  [...entries].filter(e => !e.marks.quiet && e.day.slice(5) === md && Number(e.day.slice(0, 4)) < y).sort((a, b) => a.at - b.at).forEach(e => { const yr = Number(e.day.slice(0, 4)); if (!by.has(yr)) by.set(yr, e); });
  return [...by].sort((a, b) => b[0] - a[0]).map(([year, entry]) => ({ year, entry }));
}
export function randomDay(days: string[], rand: () => number, exclude: Set<string>): string | null {
  const pool = days.filter(d => !exclude.has(d)); return pool.length ? pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))] : null;
}
export function thenAndNow(entries: Entry[], day: string): { then?: { year: number; entry: Entry }; now?: Entry } {
  const now = [...entries].filter(e => e.day === day && !e.marks.quiet).sort((a, b) => a.at - b.at)[0], then = onThisDay(entries, day)[0];
  return { ...(then ? { then } : {}), ...(now ? { now } : {}) };
}
/* An echo: the latest earlier day you named the same feeling, never from a "don't bring back" line. */
export function echoFor(moment: Moment, moments: Moment[], entries: Entry[]): { day: string; word: string } | null {
  const quiet = quietIds(entries);
  const hit = moments.filter(m => m.word === moment.word && m.day < moment.day && !(m.entryId != null && quiet.has(m.entryId))).sort((a, b) => b.day.localeCompare(a.day))[0];
  return hit ? { day: hit.day, word: moment.word } : null;
}
