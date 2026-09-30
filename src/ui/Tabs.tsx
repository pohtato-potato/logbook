import { Icon, type IconName } from './Icons';
import { go, type Route } from '../router';

const TABS: [Route['name'] & ('today' | 'cal' | 'settings'), string, IconName][] = [['today', 'Today', 'today'], ['cal', 'Calendar', 'cal'], ['settings', 'Settings', 'gear']];
/* In Stage 1, + opens the feeling picker: feelings are the only thing to add yet. Shelves and Almanac arrive in Stages 2 and 3. */
export function Tabs({ current }: { current: 'today' | 'cal' | 'settings' }) {
  const tab = ([k, label, icon]: (typeof TABS)[number]) => <button key={k} type="button" className={'tab' + (k === current ? ' on' : '')} aria-current={k === current ? 'page' : undefined} aria-label={label} onClick={() => go({ name: k } as Route)}><Icon name={icon} /><i>{label}</i></button>;
  return <nav className="tabs" aria-label="Main">
    {TABS.slice(0, 2).map(tab)}
    <button type="button" className="plus" aria-label="Add" onClick={() => go({ name: 'feel', when: 'now' })}><Icon name="plus" /></button>
    {TABS.slice(2).map(tab)}
  </nav>;
}
