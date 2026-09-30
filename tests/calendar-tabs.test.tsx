import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseRoute, routeHash } from '../src/router';
import { CalendarView } from '../src/screens/Calendar';
import { YearView } from '../src/screens/calendar/Year';
import { yearDays } from '../src/domain/looking';

describe('calendar tabs', () => {
  it('the tab is part of the route', () => {
    expect(parseRoute(routeHash({ name: 'cal', month: '2026-09', tab: 'year' }))).toEqual({ name: 'cal', month: '2026-09', tab: 'year' });
    expect(parseRoute('#/cal?tab=life')).toEqual({ name: 'cal', tab: 'life' });
    expect(parseRoute('#/cal/2026-09?tab=rocket')).toEqual({ name: 'cal', month: '2026-09' });
    expect(routeHash({ name: 'cal', month: '2026-09', tab: 'days' })).toBe('#/cal/2026-09');
  });
  it('five tabs, one selected, and the month so far in words', () => {
    const html = renderToStaticMarkup(<CalendarView month="2026-09" today="2026-09-29" tab="days" days={{ '2026-09-12': { family: 'calm', count: 3, first: true, photo: true } }} spans={[]} open={null} onOpen={() => {}} onMonth={() => {}} />);
    for (const t of ['Days', 'Gallery', 'Year', 'Life', 'Feelings']) expect(html).toContain(`>${t}</button>`);
    expect(html).toMatch(/aria-selected="true"[^>]*>Days/); expect(html).toContain('1 day kept, 3 moments, 1 first, 1 day with photos.');
  });
  it('other tabs show their own body, and Year and Life drop the month arrows', () => {
    const html = renderToStaticMarkup(<CalendarView month="2026-09" today="2026-09-29" tab="life" days={{}} spans={[]} open={null} onOpen={() => {}} onMonth={() => {}}><p>LIFE BODY</p></CalendarView>);
    expect(html).toContain('LIFE BODY'); expect(html).toContain('Your life'); expect(html).not.toContain('Previous month');
  });
});
describe('year tab', () => {
  const base = { year: 2026, today: '2026-09-29', style: 'ring' as const, onStyle() {}, onPick() {}, onYear() {}, onOpen() {}, wordsOf: () => ['calm', 'tired'] };
  it('says what it shows in words, for a sparse and an empty year', () => {
    const one = renderToStaticMarkup(<YearView {...base} days={yearDays(2026, new Map([['2026-09-12', { family: 'calm', count: 2 }]]))} pick={null} />);
    expect(one).toContain('1 day kept in 2026, mostly calm.'); expect(one).toMatch(/aria-label="2026 as a ring of days: 1 day kept, mostly calm/);
    expect(renderToStaticMarkup(<YearView {...base} days={yearDays(2026, new Map())} pick={null} />)).toContain('Nothing kept in 2026 yet.');
  });
  it('the pick sheet: a kept day, a future day, the first day of the year', () => {
    const ds = yearDays(2026, new Map([['2026-09-12', { family: 'calm', count: 2 }]]));
    expect(renderToStaticMarkup(<YearView {...base} days={ds} pick={254} />)).toMatch(/12 September[^]*Mostly calm: calm, then tired\.[^]*Day before[^]*Open this day[^]*Day after/);
    expect(renderToStaticMarkup(<YearView {...base} days={ds} pick={300} />)).toContain('Not written yet. This day is still ahead.');
    const first = renderToStaticMarkup(<YearView {...base} days={ds} pick={0} />); expect(first).toContain('Nothing kept on this day.'); expect(first).not.toContain('Day before');
  });
  it('no next year past the current one', () => expect(renderToStaticMarkup(<YearView {...base} days={yearDays(2026, new Map())} pick={null} />)).not.toContain('aria-label="Next year"'));
});

