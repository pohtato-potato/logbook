import { Icon, type IconName } from './Icons';
import { go, type Route } from '../router';

type TabName = 'today' | 'cal' | 'shelves' | 'settings';
const TABS: [TabName, string, IconName][] = [['today', 'Today', 'today'], ['cal', 'Calendar', 'cal'], ['shelves', 'Shelves', 'shelves'], ['settings', 'Settings', 'sliders']];
/* Today · Calendar · + · Shelves · Settings. In Stage 3 Almanac takes Settings' place, and Settings moves to Today's header. */
export function Tabs({ current }: { current: TabName | '' }) {
  const tab = ([k, label, icon]: (typeof TABS)[number]) => <button key={k} type="button" className={'tab' + (k === current ? ' on' : '')} aria-current={k === current ? 'page' : undefined} aria-label={label} onClick={() => go({ name: k } as Route)}><Icon name={icon} /><i>{label}</i></button>;
  return <nav className="tabs" aria-label="Main">
    {TABS.slice(0, 2).map(tab)}
    <button type="button" className="plus" aria-label="Add" onClick={() => go({ name: 'add' })}><Icon name="plus" /></button>
    {TABS.slice(2).map(tab)}
  </nav>;
}
