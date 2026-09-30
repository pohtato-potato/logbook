import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseRoute, routeHash } from '../src/router';
import { CalendarView } from '../src/screens/Calendar';
import { YearView } from '../src/screens/calendar/Year';
import { GalleryView } from '../src/screens/calendar/Gallery';
import { LifeView } from '../src/screens/calendar/Life';
import { FeelingsView } from '../src/screens/calendar/Feelings';
import { drawClock } from '../src/draw/clock';
import { lookOf } from '../src/draw/forms';
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
describe('gallery and life', () => {
  it('gallery: a bloom per kept day, named in words; other days dimmed', () => {
    const html = renderToStaticMarkup(<GalleryView month="2026-09" today="2026-09-29" cells={{ '2026-09-12': { overall: 'calm', moments: [{ h: 9, family: 'calm', strength: 3 }] } }} onOpen={() => {}} />);
    expect(html).toContain('aria-label="12 September: mostly calm, 1 moment"'); expect(html).toContain('class="gc2 future"'); expect(html).not.toMatch(/undefined|NaN/);
    expect(renderToStaticMarkup(<GalleryView month="2026-09" today="2026-09-29" cells={{}} onOpen={() => {}} />)).toContain('Nothing kept this month yet.');
  });
  it('life: year, text, written later, and a way to add more; a kind empty state', () => {
    expect(renderToStaticMarkup(<LifeView items={[{ year: 2019, day: '2019-06-14', text: 'Graduation', later: true }]} onAdd={() => {}} />)).toMatch(/2019[^]*Graduation[^]*Written later[^]*Add something from before/);
    expect(renderToStaticMarkup(<LifeView items={[]} onAdd={() => {}} />)).toContain('Your life’s big days gather here');
  });
});
describe('feelings tab', () => {
  const counts = { bright: 0, proud: 0, curious: 0, calm: 2, warm: 3, wistful: 0, low: 0, tense: 0, heated: 0 };
  const empty = Array.from({ length: 24 }, (_, hour) => ({ hour, parts: [] as never[], count: 0 }));
  const base = { month: '2026-09', stats: { counts, total: 5, top: ['warm', 'calm'] as never }, words: [['calm', { family: 'calm', n: 2 }]] as never, mix: empty, often: [], withPeople: [], onSel() {}, daysWith: ['2026-09-03'] };
  it('the nine with counts, words, a clock in words, and kind empty states', () => {
    const html = renderToStaticMarkup(<FeelingsView {...base} sel={{ kind: 'fam', key: 'warm' }} />);
    expect(html).toContain('Mostly warm and calm this month.'); expect(html).toContain('3 moments'); expect(html).toContain('calm · 2');
    expect(html).toMatch(/1 day<\/b> had some warm in them/); expect(html).toContain('Too few moments yet to see a pattern through the day.');
    expect(html).toContain('No tags on two or more days yet.'); expect(html).toContain('No days with people yet.'); expect(html).not.toMatch(/NaN|Infinity|undefined/);
    expect(html).toMatch(/aria-pressed="true"[^>]*>[^]*Warm/); expect(html).toContain(', lit');
  });
  it('a chosen word says how many days and what it means', () => {
    const html = renderToStaticMarkup(<FeelingsView {...base} sel={{ kind: 'word', key: 'calm' }} daysWith={['2026-09-03', '2026-09-05']} />);
    expect(html).toMatch(/2 days<\/b> you felt calm\./); expect(html).toContain('Steady; nothing pulling at you.');
  });
  it('the clock draws with no moments without errors', () => {
    const ctx = new Proxy({}, { get: () => (...a: number[]) => { if (a.some(v => typeof v === 'number' && !Number.isFinite(v))) throw new Error('bad'); }, set: () => true }) as unknown as CanvasRenderingContext2D;
    drawClock(ctx, lookOf('dark'), 320, 270, empty);
  });
});

