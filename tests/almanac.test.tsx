import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseRoute, routeHash } from '../src/router';
import { Tabs } from '../src/ui/Tabs';
import { AlmanacView } from '../src/screens/Almanac';

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
