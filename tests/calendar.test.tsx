import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CalendarView, monthGrid } from '../src/screens/Calendar';

describe('month grid', () => {
  it('starts on Monday', () => {
    const g = monthGrid('2026-09'); // 1 September 2026 is a Tuesday
    expect(g[0]).toBeNull();
    expect(g[1]).toBe('2026-09-01');
    expect(g.filter(Boolean)).toHaveLength(30);
  });
});
describe('the Days tab', () => {
  const noop = () => {};
  it('labels each kept day in words, marks firsts and today, and shows a key', () => {
    const html = renderToStaticMarkup(<CalendarView month="2026-09" today="2026-09-29" days={{ '2026-09-12': { family: 'calm', count: 3, first: true } }} open={null} onOpen={noop} onMonth={noop} />);
    expect(html).toContain('aria-label="12 September: mostly calm, 3 moments, a first"');
    expect(html).toMatch(/class="mc today"/);
    expect(html).toContain('Each day shows the form of its main feeling');
    expect(html).toContain('Calm');
  });
  it('opens a day with the day before and after', () => {
    const html = renderToStaticMarkup(<CalendarView month="2026-09" today="2026-09-29" days={{ '2026-09-11': { family: 'warm', count: 1, first: false }, '2026-09-12': { family: 'calm', count: 3, first: true }, '2026-09-14': { family: 'low', count: 2, first: false } }} open="2026-09-12" onOpen={noop} onMonth={noop} />);
    expect(html).toContain('11 Sep');
    expect(html).toContain('14 Sep');
    expect(html).toContain('Open this day');
  });
});
