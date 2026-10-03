import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseRoute, routeHash, type Route } from '../src/router';
import { AddSheetView } from '../src/screens/AddSheet';
import { Tabs } from '../src/ui/Tabs';

describe('new routes', () => {
  it('round-trip', () => {
    const rs: Route[] = [{ name: 'add' }, { name: 'form', kind: 'quote' }, { name: 'shelves' }, { name: 'shelf', shelf: 'places' }, { name: 'person', id: 'a' }, { name: 'tag', tag: 'walk' }, { name: 'search' }];
    for (const r of rs) expect(parseRoute(routeHash(r))).toEqual(r);
  });
  it('an unknown form or shelf goes to Today', () => { expect(parseRoute('#/form/rocket')).toEqual({ name: 'today' }); expect(parseRoute('#/shelf/rocket')).toEqual({ name: 'today' }); });
  it('tags with spaces or accents survive', () => expect(parseRoute(routeHash({ name: 'tag', tag: 'café' }))).toEqual({ name: 'tag', tag: 'café' }));
});
describe('the + sheet', () => {
  it('lists every kind, with Feeling as the big button at the bottom', () => {
    const html = renderToStaticMarkup(<AddSheetView />);
    for (const w of ['Photo', 'Quote', 'Place', 'Person', 'Keepsake', 'Voice note', 'Span', 'Something from before']) expect(html).toContain(w);
    expect(html.lastIndexOf('Feeling')).toBeGreaterThan(html.lastIndexOf('Something from before'));
  });
  it('the tab bar has Shelves, marked as the current page', () => expect(renderToStaticMarkup(<Tabs current="shelves" />)).toMatch(/aria-current="page" aria-label="Shelves"/));
});
