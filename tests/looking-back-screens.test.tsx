import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TodayView } from '../src/screens/Today';
import { DayPageView } from '../src/screens/DayPage';

const noop = () => {};
const base = { now: new Date('2026-09-29T15:00:00'), greeting: 'Hi.', entries: [], moments: [], foldedOpen: false, onToggleFold: noop, onConfirmOverall: noop, onChangeOverall: noop, onOpenFeeling: noop, onEntryMenu: noop, writer: <div /> };
describe('on this day', () => {
  it('shows an earlier year’s line, with then and now', () => {
    const html = renderToStaticMarkup(<TodayView {...base} night={false} onThisDay={{ year: 2025, text: 'First walk in the monsoon.' }} />);
    expect(html).toMatch(/On this day, 2025[^]*First walk in the monsoon[^]*Then and now/);
  });
  it('is absent when there is nothing, and folds away at night', () => {
    expect(renderToStaticMarkup(<TodayView {...base} night={false} />)).not.toContain('On this day');
    const night = renderToStaticMarkup(<TodayView {...base} night={true} onThisDay={{ year: 2025, text: 'x' }} />);
    expect(night).not.toContain('On this day, 2025'); expect(night).toContain('on this day');
  });
});
describe('echoes', () => {
  const ms = [{ id: 1, day: '2026-09-29', at: new Date('2026-09-29T20:00:00').getTime(), word: 'wistful', family: 'wistful' as const, strength: 3 }];
  it('an echo links to the earlier day in words', () => {
    const html = renderToStaticMarkup(<DayPageView day="2026-09-29" style="bloom" entries={[]} moments={ms} own={{}} echoes={new Map([[1, { day: '2026-03-14', word: 'wistful' }]])} />);
    expect(html).toContain('Echo: you felt wistful on 14 March too');
  });
  it('no echo without one', () => expect(renderToStaticMarkup(<DayPageView day="2026-09-29" style="bloom" entries={[]} moments={ms} own={{}} />)).not.toContain('Echo'));
});
