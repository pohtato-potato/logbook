import type { DayRow, Entry, Moment } from '../db/types';
import { FAMILY_NAME, ladderName } from '../vocab/vocab';
import { weatherLine } from './stamps';
import { airWords } from './aqi';
import { EMPTY_LOOKUP, entryLine, plainWords, type Lookup } from './entryText';
import { localDate, parseDay, timeLabel, timeLabelIn } from './day';

const MARK_WORD = { first: 'first', gift: 'gift', priv: 'private', quiet: 'don’t bring back' } as const;
export { plainWords };
/* The day's files in the export, as paths relative to the zip's root. */
export type DayFiles = { photos: { path: string; potd: boolean }[]; audio: Map<number, string>; keepPhotos?: Map<number, string> };
const keepLink = (e: Entry, line: string, path?: string) => (path && e.data?.kind === 'keep' ? `${line} ![Keepsake](../../${path})` : line);
const written = (ms: number) => parseDay(localDate(ms)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const voiceLink = (e: Entry, line: string, path?: string) => (path && e.data?.kind === 'voice' ? line.replace(/^(Voice note, [0-9:]+)\./, `[$1](../../${path}).`) : line);
const q = (s: string) => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
/* One day as a plain Markdown file anyone can read in ten years: front matter, then entries and feelings in time order. */
export function dayToMarkdown(day: string, row: DayRow | undefined, entries: Entry[], moments: Moment[], lk: Lookup = EMPTY_LOOKUP, files: DayFiles = { photos: [], audio: new Map() }): string {
  const fm = ['---', `date: ${day}`];
  if (row?.overall) fm.push(`overall: ${q(`${row.overall.word} (${FAMILY_NAME[row.overall.family]}, ${ladderName(row.overall.family, row.overall.strength)})`)}`);
  if (row?.stamps?.weather) fm.push(`weather: ${q(weatherLine(row.stamps.weather))}`);
  const air = row?.stamps?.air; if (air && !air.none && air.aqi != null && air.category) fm.push(`air: ${q(airWords({ aqi: air.aqi, category: air.category }))}`);
  const tags = [...new Set(entries.flatMap(e => e.tags))], people = [...new Set(entries.flatMap(e => e.people))];
  if (tags.length) fm.push(`tags: [${tags.map(q).join(', ')}]`);
  if (people.length) fm.push(`people: [${people.map(q).join(', ')}]`);
  const marked = (Object.keys(MARK_WORD) as (keyof typeof MARK_WORD)[]).filter(k => entries.some(e => e.marks[k]));
  if (marked.length) fm.push(`marks: [${marked.map(k => q(MARK_WORD[k])).join(', ')}]`);
  fm.push('---', '');
  const body: string[] = [];
  [...entries].sort((a, b) => a.at - b.at).forEach(e => {
    const line = keepLink(e, voiceLink(e, entryLine(e, lk), files.audio.get(e.id!)), files.keepPhotos?.get(e.id!));
    if (e.data?.kind === 'past') body.push('## Written later', '', line.replace(/^Written later: /, ''), '', `Written on ${written(e.writtenAt)}`, '');
    else body.push(`## ${timeLabelIn(e.at, e.tz)}`, '', line, '');
    const marks = (Object.keys(MARK_WORD) as (keyof typeof MARK_WORD)[]).filter(k => e.marks[k]).map(k => MARK_WORD[k]);
    if (marks.length) body.push(`Marks: ${marks.join(', ')}`, '');
  });
  if (moments.length) {
    body.push('## Feelings', '');
    [...moments].sort((a, b) => a.at - b.at).forEach(m => body.push(`- ${timeLabel(new Date(m.at))}, ${m.word} (${FAMILY_NAME[m.family]}, ${ladderName(m.family, m.strength)})${m.second ? `, with ${FAMILY_NAME[m.second].toLowerCase()}` : ''}${m.about ? `, ${m.about}` : ''}`));
    body.push('');
  }
  if (files.photos.length) { body.push('## Photos', ''); [...files.photos].sort((a, b) => Number(b.potd) - Number(a.potd)).forEach(p => body.push(`![Photo](../../${p.path})${p.potd ? ' (photo of the day)' : ''}`, '')); }
  if (row?.grateful) body.push('## Grateful for', '', row.grateful, '');
  return fm.join('\n') + body.join('\n');
}
