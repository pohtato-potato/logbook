import type { ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Tabs } from '../ui/Tabs';
import { ALM_TABS, go, type AlmTab } from '../router';

const TAB_NAME: Record<AlmTab, string> = { report: 'Report', headlines: 'Headlines', wrapped: 'Wrapped', random: 'A random day' };
/* The Almanac describes the year, like a small newspaper about you. It never predicts. */
export function AlmanacView({ tab, mast, children }: { tab: AlmTab; mast: { issue: number; year: number; kept: number }; children: ReactNode }) {
  return <div className="scr"><div className="content scroll">
    <header className="mast"><h1 className="mast-t">The Almanac</h1><p className="mast-s"><span>No. {mast.issue}</span><span>{mast.year}, so far</span><span>{mast.kept} {mast.kept === 1 ? 'day' : 'days'} kept</span></p></header>
    <div className="ctabs" role="tablist" aria-label="Almanac">{ALM_TABS.map(k => <button key={k} type="button" role="tab" aria-selected={k === tab} className={k === tab ? 'on' : ''} onClick={() => go({ name: 'almanac', tab: k })}>{TAB_NAME[k]}</button>)}</div>
    {children}
  </div><Tabs current="almanac" /></div>;
}
export function Almanac({ tab = 'report' }: { tab?: AlmTab }) {
  const d = useLiveQuery(async () => {
    const days = new Set([...(await db.moments.toArray()).map(m => m.day), ...(await db.entries.toArray()).map(e => e.day)]), year = new Date().getFullYear(), sorted = [...days].sort();
    const first = sorted[0], issue = first ? (year - Number(first.slice(0, 4))) * 12 + (new Date().getMonth() + 1 - Number(first.slice(5, 7))) + 1 : 1;
    return { issue: Math.max(1, issue), year, kept: sorted.filter(x => x.startsWith(String(year))).length };
  }, []);
  if (!d) return <div className="scr" />;
  return <AlmanacView tab={tab} mast={d}><p className="entry">Coming in this stage.</p></AlmanacView>;
}
