import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseRoute, routeHash } from '../src/router';
import { Tabs } from '../src/ui/Tabs';
import { AlmanacView, ReportView, HeadlinesView, RandomView } from '../src/screens/Almanac';
import { yearDays } from '../src/domain/looking';
import { setHeadline } from '../src/db/actions';
import { openDb } from '../src/db/db';

describe('the Almanac', () => {
  it('has its own tab, and Settings is no longer a tab', () => {
    const html = renderToStaticMarkup(<Tabs current="almanac" />);
    expect(html).toMatch(/aria-current="page" aria-label="Almanac"/); expect(html).not.toContain('aria-label="Settings"');
  });
  it('the tab is in the route', () => {
    expect(parseRoute(routeHash({ name: 'almanac', tab: 'wrapped' }))).toEqual({ name: 'almanac', tab: 'wrapped' });
    expect(routeHash({ name: 'almanac', tab: 'report' })).toBe('#/almanac'); expect(parseRoute('#/almanac?tab=rocket')).toEqual({ name: 'almanac' });
    expect(parseRoute('#/share')).toEqual({ name: 'share' });
  });
  it('the masthead names the issue, the year and the days kept', () => {
    const html = renderToStaticMarkup(<AlmanacView tab="report" mast={{ issue: 3, year: 2026, kept: 41 }}><p /></AlmanacView>);
    expect(html).toContain('The Almanac'); expect(html).toContain('No. 3'); expect(html).toContain('2026, so far'); expect(html).toContain('41 days kept');
    expect(html).toMatch(/aria-selected="true"[^>]*>Report/); expect(html).toContain('>A random day</button>');
  });
});
const bad = /undefined|NaN| 0 places/;
describe('almanac tabs', () => {
  const days = yearDays(2026, new Map());
  it('an empty year says so, with no numbers', () => {
    const html = renderToStaticMarkup(<ReportView report={{ headline: 'Nothing kept this year yet.', numbers: [], notable: [] }} days={days} today="2026-09-29" voice={0} />);
    expect(html).toContain('Nothing kept this year yet.'); expect(html).not.toContain('rep-cell'); expect(html).not.toMatch(bad);
  });
  it('the forecast is only ever the Conspiracy theorist’s joke', () => {
    const r = { headline: 'A warm year so far.', numbers: [{ n: 5, label: 'feelings named', sub: '2 families' }], notable: [{ n: '3', text: 'times you named calm, more than any other word' }] };
    const plain = renderToStaticMarkup(<ReportView report={r} days={days} today="2026-09-29" voice={0} />);
    expect(plain).not.toContain('Outlook'); expect(plain).toContain('rep-cell'); expect(plain).toContain('Notable');
    const joke = renderToStaticMarkup(<ReportView report={r} days={days} today="2026-09-29" voice={7} topFamily="warm" />);
    expect(joke).toContain('Who is ‘they’? Exactly.'); expect(joke).toContain('A joke. Logbook never predicts how you’ll feel.');
  });
  it('headlines: the suggestion waits in the box, and weeks without a line say it was suggested', () => {
    const html = renderToStaticMarkup(<HeadlinesView today="2026-09-27" value="" suggestion="Mostly calm, with #walk." onValue={() => {}} onKeep={() => {}}
      weeks={[{ label: '21 to 27 September', line: 'Mostly calm, with #walk.', suggested: true }]} months={[{ month: 'September', family: 'calm', line: 'Mostly calm.' }]} year={2026} />);
    expect(html).toContain('Sunday: this week in a line'); expect(html).toContain('placeholder="Mostly calm, with #walk."'); expect(html).toContain('suggested');
    expect(html).toContain('2026 in twelve lines, so far'); expect(html).not.toMatch(bad);
  });
  it('a random day needs a few days first', () => {
    expect(renderToStaticMarkup(<RandomView pick={null} enough={false} onAnother={() => {}} onOpen={() => {}} today="2026-09-29" then={null} now={null} />)).toContain('A random day needs a few more days kept.');
    const html = renderToStaticMarkup(<RandomView pick={{ day: '2026-03-14', family: 'warm', line: 'Mangoes on the roof.' }} enough onAnother={() => {}} onOpen={() => {}} today="2026-09-29" then={{ year: 2025, line: 'First walk in the monsoon.' }} now={{ line: 'A new café.' }} />);
    expect(html).toMatch(/14 March 2026[^]*Mangoes on the roof[^]*Another day/); expect(html).toMatch(/Then and now, 29 September[^]*2025[^]*First walk[^]*2026[^]*A new café/);
  });
  it('a headline is kept on the week’s Sunday, with Undo', async () => {
    const db = openDb('hl-1'); await db.open();
    const u = await setHeadline(db, '2026-09-27', ' A deadline, then the long walk home. ');
    expect((await db.days.get('2026-09-27'))?.headline).toBe('A deadline, then the long walk home.');
    await u.run(); expect(await db.days.get('2026-09-27')).toBeUndefined();
  });
});

