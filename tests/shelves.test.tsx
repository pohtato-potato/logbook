import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ShelfView, ShelvesView, shelfCounts, nextBirthday } from '../src/screens/Shelves';

const lk = { places: new Map(), spans: new Map(), people: new Map() };
const e = (x: object) => ({ id: 1, day: '2026-09-21', at: 0, tz: 'UTC', kind: 'line', text: 'the best chai', marks: {}, tags: [], people: [], writtenAt: 0, ...x });
const base = { entries: [], lookup: lk, thumbs: new Map(), places: [], homes: [], people: [], spans: [], today: '2026-09-29' };
describe('shelves', () => {
  it('counts firsts this year', () => {
    const c = shelfCounts([e({ marks: { first: true } }), e({ day: '2025-01-01', marks: { first: true } }), e({ kind: 'media', data: { kind: 'media', media: 'Book', title: 'X', rating: 5, current: true } })] as never, [], [], [], '2026-09-29');
    expect(c.firsts).toBe('1 this year');
  });
  it('birthdays count down from today, and wrap to next year', () => {
    expect(nextBirthday('10-11', '2026-09-29')).toEqual({ day: '2026-10-11', inDays: 12 });
    expect(nextBirthday('01-02', '2026-09-29')).toEqual({ day: '2027-01-02', inDays: 95 });
    expect(nextBirthday('09-29', '2026-09-29')?.inDays).toBe(0);
    expect(nextBirthday('nonsense', '2026-09-29')).toBeNull();
  });
  it('an empty shelf says what goes there', () => expect(renderToStaticMarkup(<ShelfView shelf="firsts" {...base} />)).toContain('Firsts appear here when you mark something First'));
  it('birthdays show who and when', () => {
    const html = renderToStaticMarkup(<ShelfView shelf="bdays" {...base} people={[{ id: 'a', initial: 'A', name: 'Friend A', thread: 0, birthday: '10-11' }]} />);
    expect(html).toContain('Friend A'); expect(html).toContain('in 12 days');
  });
  it('places without a position are still listed', () => expect(renderToStaticMarkup(<ShelfView shelf="places" {...base} places={[{ id: 1, name: 'Somewhere', first: false, visits: 2 }]} />)).toMatch(/Somewhere[^]*2 visits[^]*no position yet/));
  it('the index lists every shelf, people and tags, and never prints undefined', () => {
    const html = renderToStaticMarkup(<ShelvesView counts={shelfCounts([], [], [], [], '2026-09-29')} people={[{ id: 'a', initial: 'A', name: 'Friend A', thread: 0 }]} tags={[{ name: 'walk', family: 'warm' }]} />);
    for (const w of ['Firsts', 'Quotes', 'Places', 'Keepsakes', 'Birthdays and gifts', 'Spans', 'Friend A', 'walk']) expect(html).toContain(w);
    expect(html).not.toMatch(/undefined|NaN/);
  });
});
