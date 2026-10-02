import type { ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { PERSON_THREADS } from '../domain/colour';
import { dayKey, parseDay } from '../domain/day';
import { dateRange } from '../domain/entryText';
import { dayFamilies, openTo } from '../domain/looking';
import { usePrivacy } from '../ui/Privacy';
import { drawSmall } from '../draw/forms';
import { Scene } from '../draw/Canvas';
import { FAMILY_NAME, type Family } from '../vocab/vocab';
import { Icon } from '../ui/Icons';
import { useLook } from '../ui/Look';
import { useNow } from '../ui/useNow';
import { useStamps } from '../ui/useStamps';
import { go, type Route } from '../router';
import { monthGrid } from './Calendar';

/* The laptop, as a reading room: the month and spans on the left, the writing column and the day in the middle, stamps, people and keys on the right. */
export function DeskView({ left, mid, right }: { left: ReactNode; mid: ReactNode; right: ReactNode }) {
  return <div className="desk">
    <aside className="lp-col lp-left" aria-label="Navigation and the month">{left}</aside>
    <main className="lp-col lp-mid">{mid}</main>
    <aside className="lp-col lp-right" aria-label="Stamps, people and keys">{right}
      <h2 className="lbl">Keys</h2><dl className="keys"><dt><kbd>/</kbd></dt><dd>search</dd><dt><kbd>N</kbd></dt><dd>write</dd>
        <dt><kbd>←</kbd> <kbd>→</kbd></dt><dd>day before, day after</dd><dt><kbd>G</kbd> <kbd>C</kbd></dt><dd>calendar</dd><dt><kbd>G</kbd> <kbd>T</kbd></dt><dd>today</dd></dl></aside>
  </div>;
}
function Glyph({ family }: { family: Family }) { const look = useLook(); return <Scene label="" draw={(ctx, w, h) => drawSmall(ctx, look, family, w / 2, h / 2, Math.min(w, h) * 0.45)} />; }
const NAV: [Route['name'], string][] = [['today', 'Today'], ['cal', 'Calendar'], ['shelves', 'Shelves'], ['almanac', 'Almanac'], ['settings', 'Settings']];
function Left({ route, day }: { route: Route; day: string }) {
  const month = day.slice(0, 7), { pal } = useLook(), today = dayKey(useNow());
  const d = useLiveQuery(async () => {
    const first = month + '-01', last = month + '-31';
    const [moments, rows, spans] = await Promise.all([db.moments.where('day').between(first, last, true, true).toArray(), db.days.where('day').between(first, last, true, true).toArray(), db.spans.toArray()]);
    return { fams: dayFamilies(moments, rows), spans: spans.filter(s => s.from <= last && s.to >= first) };
  }, [month]);
  return <>
    <p className="lp-brand">Logbook</p>
    <button type="button" className="lp-search" onClick={() => go({ name: 'search' })}><Icon name="search" /><span>Search everything</span><kbd>/</kbd></button>
    <nav className="lp-nav" aria-label="Main">{NAV.map(([k, l]) => <button key={k} type="button" className={route.name === k ? 'on' : ''} aria-current={route.name === k ? 'page' : undefined} onClick={() => go({ name: k } as Route)}>{l}</button>)}</nav>
    <h2 className="lbl">{parseDay(month + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h2>
    <div className="lp-cal" role="group" aria-label="This month">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x, i) => <i key={'h' + i} aria-hidden="true">{x}</i>)}
      {monthGrid(month).map((x, i) => { if (!x) return <span key={'b' + i} />; const f = d?.fams.get(x);
        return <button key={x} type="button" className={(x === today ? 'today ' : '') + (x > today ? 'future' : '')} aria-label={`${parseDay(x).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}${f ? `: mostly ${FAMILY_NAME[f.family].toLowerCase()}` : ''}`}
          onClick={() => go(x === today ? { name: 'today' } : { name: 'day', day: x })}><b>{+x.slice(8)}</b>{f && <Glyph family={f.family} />}</button>; })}</div>
    {!!d?.spans.length && <><h2 className="lbl">Spans</h2>{d.spans.map(s => <p key={s.id} className="spanline"><i style={{ background: pal[s.family] }} aria-hidden="true" />{s.name}, {dateRange(s.from, s.to)}</p>)}</>}
  </>;
}
function Right({ day }: { day: string }) {
  const st = useStamps(day), { locked } = usePrivacy();
  const people = useLiveQuery(async () => { const inits = new Set(openTo(await db.entries.where('day').equals(day).toArray(), locked).flatMap(e => e.people)); return (await db.people.toArray()).filter(p => inits.has(p.initial)); }, [day, locked]) ?? [];
  return <>
    <h2 className="lbl">{day === dayKey(new Date()) ? 'Today’s stamps' : 'The day’s stamps'}</h2>
    {st.list.length ? <div className="stamps one">{st.list.slice(0, 6).map(([k, v]) => <p key={k} className="stamp"><b>{k}</b>{v}</p>)}</div> : <p className="hint">No stamps yet.</p>}
    <h2 className="lbl">Together {day === dayKey(new Date()) ? 'today' : 'that day'}</h2>
    {people.length ? <div className="faces">{people.map(p => <button key={p.id} type="button" className="face" style={{ ['--pc' as string]: PERSON_THREADS[p.thread % PERSON_THREADS.length] }} aria-label={`${p.name}. Open their page`} onClick={() => go({ name: 'person', id: p.id })}>{p.initial}</button>)}</div>
      : <p className="hint">Nobody named yet.</p>}
  </>;
}
/* Today or a day page, set in the reading room. The middle column is the same screen as on the phone, without its tab bar. */
export function Desk({ route, children }: { route: Route; children: ReactNode }) {
  const today = dayKey(useNow()), day = route.name === 'day' ? route.day : today;
  return <DeskView left={<Left route={route} day={day} />} mid={children} right={<Right day={day} />} />;
}
