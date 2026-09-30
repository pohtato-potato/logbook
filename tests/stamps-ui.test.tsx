import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { OutsideLine, StampsPanelView } from '../src/screens/Stamps';
import { TodayView } from '../src/screens/Today';

const list: [string, string][] = [['Outside', 'Partly cloudy, 31° by day, 24° at night'], ['Air outside', '212, poor (India scale)'], ['Sun', 'rise 6:08 am, set 6:04 pm'], ['Day length', '11 h 56 m'], ['Moon', 'Waning, 88% lit'], ['At this home', '412 days']];
const noop = () => {};
const stamps = { list, status: 'ok' as const, open: false, onToggle: noop, onWhere: noop, canLocate: true, placeSource: 'home' as const };
describe('stamps panel', () => {
  it('shows four, then offers the rest', () => {
    const html = renderToStaticMarkup(<StampsPanelView {...stamps} />);
    expect(html).toContain('Today’s stamps'); expect(html).toContain('Show all 6'); expect(html).toContain('aria-expanded="false"'); expect(html).not.toContain('412 days');
    expect(html).toContain('Add where I am today');
  });
  it('opened, shows everything; where already given, no button', () => {
    const html = renderToStaticMarkup(<StampsPanelView {...stamps} open placeSource="here" />);
    expect(html).toContain('412 days'); expect(html).toContain('Show fewer'); expect(html).not.toContain('Add where I am today');
  });
  it.each([['offline', 'Waiting for a connection. Nothing is lost.'], ['off', 'Weather is switched off in Settings.'], ['no-place', 'Add where you are, or load your homes in Settings, for weather here.']] as const)('%s says so', (status, words) =>
    expect(renderToStaticMarkup(<StampsPanelView {...stamps} list={[['Moon', 'Full moon']]} status={status} canLocate={false} placeSource={undefined} />)).toContain(words));
  it('the header line is short, and absent without weather', () => {
    expect(renderToStaticMarkup(<OutsideLine list={list} />)).toContain('Outside: Partly cloudy, 31° · air 212, poor');
    expect(renderToStaticMarkup(<OutsideLine list={[['Moon', 'Full moon']]} />)).toBe('');
  });
});
describe('stamps on Today', () => {
  const base = { now: new Date('2026-09-29T15:00:00'), greeting: 'Hi.', entries: [], moments: [], foldedOpen: false, onToggleFold: noop, onConfirmOverall: noop, onChangeOverall: noop, onOpenFeeling: noop, onEntryMenu: noop, writer: <div />, stamps };
  it('by day: after inner weather, with the Outside line in the header', () => {
    const html = renderToStaticMarkup(<TodayView {...base} night={false} />);
    expect(html.indexOf('Today’s stamps')).toBeGreaterThan(html.indexOf('Inner weather')); expect(html).toContain('Outside: Partly cloudy');
  });
  it('at night they fold into Today so far', () => {
    const html = renderToStaticMarkup(<TodayView {...base} night={true} />);
    expect(html).not.toContain('Today’s stamps'); expect(html).toMatch(/grateful for · stamps|stamps/);
  });
});
