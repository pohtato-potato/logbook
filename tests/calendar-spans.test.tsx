import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CalendarView } from '../src/screens/Calendar';

const base = { month: '2026-09', today: '2026-09-29', open: null, onOpen() {}, onMonth() {} };
describe('spans on the calendar', () => {
  it('marks the days, kept or not, and names the span in words', () => {
    const html = renderToStaticMarkup(<CalendarView {...base} days={{ '2026-09-18': { family: 'curious', count: 2, first: false } }} spans={[{ id: 1, name: 'Trip', from: '2026-09-17', to: '2026-09-21', family: 'curious' }]} />);
    expect(html).toMatch(/aria-label="18 September: mostly curious, 2 moments, part of Trip"/);
    expect(html).toMatch(/class="mc inspan[^"]*"[^>]*>[^]*?17</);
    expect(html).toContain('Trip, 17 to 21 September');
  });
  it('a span running into next month is listed with both dates', () => {
    const html = renderToStaticMarkup(<CalendarView {...base} days={{}} spans={[{ id: 2, name: 'Diwali at home', from: '2026-09-28', to: '2026-10-02', family: 'warm' }]} />);
    expect(html).toContain('Diwali at home, 28 September to 2 October');
  });
  it('without spans, nothing changes', () => expect(renderToStaticMarkup(<CalendarView {...base} days={{}} spans={[]} />)).not.toContain('inspan'));
});
