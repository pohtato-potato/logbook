import { Icon } from '../ui/Icons';
import { Tabs } from '../ui/Tabs';

/* A screen whose task hasn't been built yet on this branch: a heading and a way back. */
export function Later({ title, tab = '' }: { title: string; tab?: 'shelves' | '' }) {
  return <div className="scr"><div className="content scroll"><header className="thead row2"><button type="button" className="back" aria-label="Back" onClick={() => history.back()}><Icon name="back" /></button><h1 className="tdate sm">{title}</h1></header>
    <p className="entry">Coming in this stage.</p></div><Tabs current={tab} /></div>;
}
