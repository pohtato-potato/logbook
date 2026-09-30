import type { DayRow, Entry, Moment } from '../db/types';
import { FAMILY_NAME, ladderName } from '../vocab/vocab';
import { timeLabel } from './day';

const MARK_WORD = { first: 'first', gift: 'gift', priv: 'private', quiet: 'don’t bring back' } as const;
const q = (s: string) => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
/* One day as a plain Markdown file anyone can read in ten years: front matter, then entries and feelings in time order. */
export function dayToMarkdown(day: string, row: DayRow | undefined, entries: Entry[], moments: Moment[]): string {
  const fm = ['---', `date: ${day}`];
  if (row?.overall) fm.push(`overall: ${q(`${row.overall.word} (${FAMILY_NAME[row.overall.family]}, ${ladderName(row.overall.family, row.overall.strength)})`)}`);
  const tags = [...new Set(entries.flatMap(e => e.tags))], people = [...new Set(entries.flatMap(e => e.people))];
  if (tags.length) fm.push(`tags: [${tags.map(q).join(', ')}]`);
  if (people.length) fm.push(`people: [${people.map(q).join(', ')}]`);
  fm.push('---', '');
  const body: string[] = [];
  [...entries].sort((a, b) => a.at - b.at).forEach(e => {
    body.push(`## ${timeLabel(new Date(e.at))}`, '', e.text, '');
    const marks = (Object.keys(MARK_WORD) as (keyof typeof MARK_WORD)[]).filter(k => e.marks[k]).map(k => MARK_WORD[k]);
    if (marks.length) body.push(`Marks: ${marks.join(', ')}`, '');
  });
  if (moments.length) {
    body.push('## Feelings', '');
    [...moments].sort((a, b) => a.at - b.at).forEach(m => body.push(`- ${timeLabel(new Date(m.at))}, ${m.word} (${FAMILY_NAME[m.family]}, ${ladderName(m.family, m.strength)})${m.second ? `, with ${FAMILY_NAME[m.second].toLowerCase()}` : ''}${m.about ? `, ${m.about}` : ''}`));
    body.push('');
  }
  if (row?.grateful) body.push('## Grateful for', '', row.grateful, '');
  return fm.join('\n') + body.join('\n');
}
