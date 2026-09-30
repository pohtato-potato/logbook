import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseRoute, routeHash } from '../src/router';
import { CalendarView } from '../src/screens/Calendar';

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
