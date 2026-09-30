import { Icon } from '../ui/Icons';

export type StampStatus = 'ok' | 'off' | 'no-place' | 'offline' | 'loading';
const STATUS: Partial<Record<StampStatus, string>> = {
  offline: 'Waiting for a connection. Nothing is lost.', off: 'Weather is switched off in Settings.', 'no-place': 'Add where you are, or load your homes in Settings, for weather here.' };
export type StampsProps = { title?: string; list: [string, string][]; status: StampStatus; open: boolean; onToggle(): void; onWhere(): void; canLocate: boolean; placeSource?: 'here' | 'place' | 'home' };
/* A day's stamps: four at first, the rest a tap away. Every state says what happened and that nothing is lost. */
export function StampsPanelView({ title = 'Today’s stamps', list, status, open, onToggle, onWhere, canLocate, placeSource }: StampsProps) {
  const shown = open ? list : list.slice(0, 4);
  return <section className="panel"><h2 className="lbl">{title}</h2>
    <div className="stamps">{shown.map(([k, v]) => <p key={k} className="stamp"><b>{k}</b>{v}</p>)}</div>
    {STATUS[status] && <p className="hint" role="status">{STATUS[status]}</p>}
    {list.length > 4 && <button type="button" className="btn ghost wide" aria-expanded={open} onClick={onToggle}>{open ? 'Show fewer' : `Show all ${list.length}`}</button>}
    {canLocate && placeSource !== 'here' && <button type="button" className="btn wide" onClick={onWhere}><Icon name="k-place" />Add where I am today</button>}
  </section>;
}
/* The short "Outside:" line under Today's date. Nothing at all until there is weather. */
export function OutsideLine({ list }: { list: [string, string][] }) {
  const m = Object.fromEntries(list), w = m['Outside'], a = m['Air outside'];
  if (!w) return null;
  return <p className="tstamp">Outside: {w.split(' by day')[0]}{a ? ` · air ${a.replace(/ \(India scale\)$/, '')}` : ''}</p>;
}
