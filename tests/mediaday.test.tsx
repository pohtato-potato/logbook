import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import card from './fixtures/shelf/media.day-v1.json';
import { DayPageView } from '../src/screens/DayPage';
import { MediaDayView, mediaDayMarkdown } from '../src/screens/MediaDay';
import { dayToMarkdown } from '../src/domain/markdown';
import type { MediaDay } from '../src/shelf/shelf';

const day = card.data as MediaDay;
describe("Media's day in Logbook", () => {
  it('lists what was watched, read or played, with the rating as it was that day and a link into Media', () => {
    const html = renderToStaticMarkup(<MediaDayView day={day} />);
    expect(html).toContain('From Media'); expect(html).toContain('Perfect Days'); expect(html).toContain('finished');
    expect(html).toContain('6'); expect(html).toContain('The trees at lunch.');
    expect(html).toContain('href="../media/#/work/w-perfect-days"');
  });
  it('sits on the day page when Media sent one', () => {
    const html = renderToStaticMarkup(<DayPageView day="2026-10-02" style="bloom" entries={[]} moments={[]} own={{}} media={day} />);
    expect(html).toContain('From Media'); expect(html).not.toContain('Nothing kept on this day');
  });
  it('goes into the day’s Markdown export', () => {
    expect(mediaDayMarkdown(day)).toContain('## From Media');
    const md = dayToMarkdown('2026-10-02', undefined, [], [], undefined, undefined, undefined, day);
    expect(md).toContain('## From Media'); expect(md).toContain('Perfect Days — finished, rated 6');
  });
});
