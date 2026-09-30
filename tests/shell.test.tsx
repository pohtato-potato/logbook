import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseRoute, routeHash } from '../src/router';
import { Tabs } from '../src/ui/Tabs';
import { TagChip, MarkChip } from '../src/ui/Chips';
import { VOICES } from '../src/domain/voices';

describe('routes', () => {
  it('round-trips every route', () => {
    for (const r of [{ name: 'today' }, { name: 'cal', month: '2026-09' }, { name: 'day', day: '2026-09-29' }, { name: 'feel', when: 'day' }, { name: 'settings' }, { name: 'first-run' }] as const)
      expect(parseRoute(routeHash(r))).toEqual(r);
  });
  it('sends anything unknown to Today', () => expect(parseRoute('#/nope')).toEqual({ name: 'today' }));
});
describe('shared parts', () => {
  it('tabs name every destination and mark the current one', () => {
    const html = renderToStaticMarkup(<Tabs current="cal" />);
    for (const w of ['Today', 'Calendar', 'Add', 'Settings']) expect(html).toContain(w);
    expect(html).toMatch(/aria-current="page"[^>]*>[^]*Calendar/);
  });
  it('tags show # and their name; marks show their word', () => {
    expect(renderToStaticMarkup(<TagChip tag="walk" family="warm" />)).toMatch(/#.*walk/);
    expect(renderToStaticMarkup(<MarkChip kind="quiet" on={false} onToggle={() => {}} />)).toContain('Don’t bring back');
  });
  it('has the eight voices', () => expect(VOICES.map(v => v.name)).toEqual(['Archivist', 'Friend', 'Gremlin', 'Ship’s captain', 'Nature documentary', 'Noir detective', 'Time traveller', 'Conspiracy theorist']));
});
