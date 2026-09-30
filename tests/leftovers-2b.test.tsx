import { beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { validPastDate } from '../src/screens/forms';
import { parseDay } from '../src/domain/day';
import { KeptCard } from '../src/screens/KeptCard';
import { dayToMarkdown } from '../src/domain/markdown';
import { makeMarkdownZip, placesMarkdown } from '../src/db/exportMarkdown';
import { openDb, type LogbookDb } from '../src/db/db';
import { keepKeepsake } from '../src/db/photos';

const lk = { places: new Map(), spans: new Map(), people: new Map() };
const past = { id: 9, day: '1995-03-02', at: Date.UTC(2026, 8, 29, 18, 45), tz: 'Asia/Kolkata', kind: 'past' as const, text: 'Graduation', marks: {}, tags: [], people: [], writtenAt: new Date('2026-09-30T00:15:00').getTime(), data: { kind: 'past' as const } };
let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('lo2b-' + n++); await db.open(); });
describe('2a leftovers', () => {
  it('refuses years before 1900 and never shifts small years', () => {
    expect(validPastDate('0050-01-01', '2026-09-29')).toBe('Choose a year from 1900 on.');
    expect(validPastDate('1900-01-01', '2026-09-29')).toBeNull();
    expect(parseDay('0050-01-01').getFullYear()).toBe(50);
  });
  it('something from before shows when it was written, by the local date, not a clock time', () => {
    const html = renderToStaticMarkup(<KeptCard entry={past} lookup={lk} own={{}} onOpenFeeling={() => {}} />);
    expect(html).toContain('Written later, on 30 September 2026'); expect(html).not.toMatch(/\d:\d\d [ap]m/);
  });
  it('the export gives it no time heading', () => {
    const md = dayToMarkdown('1995-03-02', undefined, [past], []);
    expect(md).toContain('## Written later'); expect(md).not.toMatch(/## \d/);
  });
  it('places.md lists every place with its position when it has one', () => {
    const md = placesMarkdown([{ id: 2, name: 'Stall', first: false, visits: 1 }, { id: 1, name: 'Café', first: true, visits: 3, lat: 10.001, lon: 20.001 }]);
    expect(md).toContain('- Café: 3 visits, a first, at 10.001, 20.001\n- Stall: 1 visit, no position');
  });
  it('a keepsake links its own photo in the export', async () => {
    await keepKeepsake(db, { name: 'Ticket', file: new Blob(['x'], { type: 'image/png' }), at: new Date('2026-09-29T20:00:00') }, async (_b, max) => new Blob([`j${max}`], { type: 'image/jpeg' }));
    const text = new TextDecoder().decode(new Uint8Array(await (await makeMarkdownZip(db)).arrayBuffer()));
    expect(text).toContain('Keepsake: Ticket. ![Keepsake](../../photos/2026/09/2026-09-29-1.jpg)'); expect(text).toContain('places.md');
  });
});
