import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { loadLookup } from '../db/lookup';
import type { Entry } from '../db/types';
import { addDays, dayKey, parseDay } from '../domain/day';
import { tagFamily } from '../domain/colour';
import type { Lookup } from '../domain/entryText';
import { FAMILY_NAME, type Family } from '../vocab/vocab';
import { TagChip } from '../ui/Chips';
import { Icon } from '../ui/Icons';
import { Tabs } from '../ui/Tabs';
import { useLook } from '../ui/Look';
import { useNow } from '../ui/useNow';
import { go } from '../router';
import { suggestedOverall } from './Today';
import { KeptCard } from './KeptCard';

/* One tag: how often this month, a strip of the month's days (each coloured by that day's feeling, and listed in words), then every entry with it. */
export function TagView({ tag, family, fromHistory, entries, dayFamily, lookup, month }: { tag: string; family: Family; fromHistory: boolean; entries: Entry[]; dayFamily: Record<string, Family>; lookup: Lookup; month: string }) {
  const { pal } = useLook(), days: string[] = [];
  for (let d = month + '-01'; d.startsWith(month); d = addDays(d, 1)) days.push(d);
  const inMonth = entries.filter(e => e.day.startsWith(month)), on = new Set(inMonth.map(e => e.day)), monthName = parseDay(month + '-01').toLocaleDateString('en-GB', { month: 'long' }), n = inMonth.length;
  return <div className="scr"><div className="content scroll">
    <header className="thead row2"><button type="button" className="back" aria-label="Back" onClick={() => history.back()}><Icon name="back" /></button><h1 className="tdate sm"><TagChip tag={tag} family={family} /></h1></header>
    <section className="panel"><p className="entry"><b>{n} {n === 1 ? 'entry' : 'entries'}</b> this month. Its colour is {FAMILY_NAME[family].toLowerCase()}, {fromHistory ? 'the feeling it most often comes with' : 'today’s feeling, until it has a history'}.</p>
      <div className="tstrip" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }} role="img" aria-label={`Days in ${monthName} with this tag: ${[...on].sort().map(d => Number(d.slice(8))).join(', ') || 'none yet'}`}>
        {days.map(d => <i key={d} className={on.has(d) ? 'on' : ''} style={on.has(d) ? { ['--fc' as string]: pal[dayFamily[d] ?? family] } : undefined} />)}</div>
      <div className="bl-scale2"><span>1 {monthName}</span><span>{days.length} {monthName}</span></div></section>
    <section className="panel">{entries.length ? [...entries].sort((a, b) => b.day.localeCompare(a.day) || b.at - a.at).map(e => <div key={e.id}><h3 className="subl">{parseDay(e.day).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</h3>
      <KeptCard entry={e} lookup={lookup} own={{}} onOpenFeeling={() => go({ name: 'day', day: e.day })} onOpenTag={t => go({ name: 'tag', tag: t })} /></div>) : <p className="entry">No entries with this tag yet.</p>}</section>
  </div><Tabs current="shelves" /></div>;
}
export function TagPage({ tag }: { tag: string }) {
  const today = dayKey(useNow());
  const d = useLiveQuery(async () => {
    const [entries, moments] = await Promise.all([db.entries.where('tags').equals(tag).toArray(), db.moments.toArray()]);
    const byDay: Record<string, Family[]> = {}; moments.forEach(m => (byDay[m.day] ??= []).push(m.family));
    const hist: Record<string, Family[]> = { [tag]: entries.flatMap(e => byDay[e.day] ?? []) }, todayFamily = suggestedOverall(moments.filter(m => m.day === today))?.family ?? 'calm';
    const dayFamily: Record<string, Family> = {}; for (const e of entries) { const s = suggestedOverall(moments.filter(m => m.day === e.day)); if (s) dayFamily[e.day] = s.family; }
    return { entries, dayFamily, family: tagFamily(tag, hist, todayFamily), fromHistory: hist[tag].length > 0, lookup: await loadLookup(db) };
  }, [tag, today]);
  return d ? <TagView tag={tag} month={today.slice(0, 7)} {...d} /> : <div className="scr" />;
}
