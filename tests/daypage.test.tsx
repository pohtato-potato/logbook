import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DayPageView, toDayMoments } from '../src/screens/DayPage';

const m = (word: string, family: 'calm' | 'warm', iso: string) => ({ id: 1, day: '2026-09-29', at: new Date(iso).getTime(), word, family, strength: 3 });
describe('the day page', () => {
  it('reads each moment once, in the story, with its time and weather name', () => {
    const html = renderToStaticMarkup(<DayPageView day="2026-09-29" style="bloom" entries={[]} moments={[m('calm', 'calm', '2026-09-29T09:10:00')]} own={{}} />);
    expect(html).toContain('9:10 am');
    expect(html).toContain('calm');
    expect(html).toContain('Calm, like clear morning');
    expect(html.match(/9:10 am/g)).toHaveLength(1);
  });
  it('an empty day says so', () => {
    expect(renderToStaticMarkup(<DayPageView day="2026-09-20" style="score" entries={[]} moments={[]} own={{}} />)).toContain('Nothing kept on this day');
  });
  it('places late-night moments after the evening', () => {
    expect(toDayMoments([m('calm', 'calm', '2026-09-30T01:30:00')])[0].h).toBeCloseTo(25.5);
  });
});
