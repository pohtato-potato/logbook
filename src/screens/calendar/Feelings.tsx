import { useState, type CSSProperties } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import type { Person } from '../../db/types';
import { addDays, parseDay } from '../../domain/day';
import { PERSON_THREADS, onColor, solid, tagFamily } from '../../domain/colour';
import { dayFamilies, hourMix, hourSummary, monthStats, monthSummary, oftenWith, peopleWith, wordCounts, type HourMix } from '../../domain/looking';
import { drawSmall } from '../../draw/forms';
import { drawClock } from '../../draw/clock';
import { Scene } from '../../draw/Canvas';
import { FAMILIES, FAMILY_NAME, findWord, type Family } from '../../vocab/vocab';
import { TagChip } from '../../ui/Chips';
import { useLook } from '../../ui/Look';
import { go } from '../../router';

export type FeelingSel = { kind: 'fam'; key: Family } | { kind: 'word'; key: string } | null;
const v = (o: Record<string, string>) => o as CSSProperties;
function Form({ family }: { family: Family }) { const look = useLook(); return <Scene label="" draw={(ctx, w, h) => drawSmall(ctx, look, family, w / 2, h / 2, Math.min(w, h) * 0.4)} />; }
const Families = ({ fs }: { fs: Family[] }) => <span className="of-f">{fs.map(f => <span key={f}><Form family={f} />{FAMILY_NAME[f].toLowerCase()}</span>)}</span>;
/* A small month where the chosen feeling's days are filled in, and read "lit" aloud. */
function MiniCal({ month, days, family }: { month: string; days: string[]; family: Family }) {
  const { pal } = useLook(), fill = solid(pal[family]), lead = (parseDay(month + '-01').getDay() + 6) % 7, out = [];
  for (let k = 0; k < lead; k++) out.push(<span key={'b' + k} className="blank" />);
  for (let d = month + '-01'; d.startsWith(month); d = addDays(d, 1)) { const on = days.includes(d); out.push(<span key={d} className={on ? 'on' : ''} style={on ? v({ '--ff': fill, '--fo': onColor(fill) }) : undefined}>{+d.slice(8)}{on && <i className="sr-only">, lit</i>}</span>); }
  return <div className="minical">{out}</div>;
}
export function FeelingsView({ month, stats, words, mix, often, withPeople, sel, onSel, daysWith }: { month: string; stats: ReturnType<typeof monthStats>; words: ReturnType<typeof wordCounts>; mix: HourMix;
  often: { tag: string; families: Family[] }[]; withPeople: { person: Person; families: Family[] }[]; sel: FeelingSel; onSel(s: FeelingSel): void; daysWith: string[] }) {
  const { pal } = useLook(), n = daysWith.length, dd = `${n} ${n === 1 ? 'day' : 'days'}`;
  const famWords = sel?.kind === 'fam' ? words.filter(([, x]) => x.family === sel.key).map(([w]) => w) : [];
  const meaning = sel?.kind === 'word' ? findWord(sel.key, {})?.meaning : undefined, wordFam = sel?.kind === 'word' ? words.find(([w]) => w === sel.key)?.[1].family ?? 'calm' : 'calm';
  return <>
    <p className="emo-sum">{monthSummary(stats)}</p>
    <section className="panel"><h2 className="lbl">The nine, this month</h2>
      <div className="emogrid">{FAMILIES.map(f => { const on = sel?.kind === 'fam' && sel.key === f; return <button key={f} type="button" className={'emocell' + (on ? ' on' : '')} aria-pressed={on} style={v({ '--fc': pal[f] })} onClick={() => onSel(on ? null : { kind: 'fam', key: f })}>
        <Form family={f} /><b>{FAMILY_NAME[f]}</b><span>{stats.counts[f]} {stats.counts[f] === 1 ? 'moment' : 'moments'}</span></button>; })}</div>
      {sel?.kind === 'fam' ? <div className="sel-box"><p className="entry"><b>{dd}</b> had some {FAMILY_NAME[sel.key].toLowerCase()} in them.{famWords.length ? ` Your words for it: ${famWords.join(', ')}.` : ''}</p>
        <MiniCal month={month} days={daysWith} family={sel.key} /><p className="hint">Days with it are filled in and read “lit”.</p></div> : <p className="hint">Tap one to see its days.</p>}</section>
    <section className="panel"><h2 className="lbl">Words you reached for</h2>
      {words.length ? <div className="chips">{words.map(([w, x]) => { const on = sel?.kind === 'word' && sel.key === w, fill = solid(pal[x.family]); return <button key={w} type="button" className={'chip' + (on ? ' on' : '')} aria-pressed={on} style={v({ '--fc': pal[x.family], '--ff': fill, '--fo': onColor(fill) })} onClick={() => onSel(on ? null : { kind: 'word', key: w })}>{w} · {x.n}</button>; })}</div>
        : <p className="hint">No feelings named yet this month.</p>}
      {sel?.kind === 'word' && <div className="sel-box"><p className="entry"><b>{dd}</b> you felt {sel.key}.{meaning ? ` ${meaning}` : ''}</p><MiniCal month={month} days={daysWith} family={wordFam} /></div>}</section>
    <section className="panel"><h2 className="lbl">Through the day</h2>
      <ClockScene mix={mix} /><p className="entry">{hourSummary(mix)}</p></section>
    <section className="panel"><h2 className="lbl">Often together</h2>
      {often.length ? <>{often.map(o => <div key={o.tag} className="often"><TagChip tag={o.tag} family={o.families[0]} onOpen={() => go({ name: 'tag', tag: o.tag })} /><span className="of-with">often with</span><Families fs={o.families} /></div>)}
        <p className="hint">The feelings that most often share a day with each tag. Nothing here is better or worse.</p></> : <p className="hint">No tags on two or more days yet. Nothing here is better or worse.</p>}</section>
    <section className="panel"><h2 className="lbl">Who you were with</h2>
      {withPeople.length ? withPeople.map(p => <div key={p.person.id} className="often"><span className="face" style={v({ '--pc': PERSON_THREADS[p.person.thread % PERSON_THREADS.length] })} aria-hidden="true">{p.person.initial}</span><span className="sr-only">{p.person.name}</span>
        <span className="of-with">days together were often</span><Families fs={p.families} /></div>) : <p className="hint">No days with people yet.</p>}</section>
  </>;
}
function ClockScene({ mix }: { mix: HourMix }) { const look = useLook(); return <Scene className="clock" label={hourSummary(mix)} draw={(ctx, w, h) => drawClock(ctx, look, w, h, mix)} />; }
/* The month's feelings, from the moments and lines kept. Private entries' words stay out while locked. */
export function Feelings({ month, locked = false }: { month: string; locked?: boolean }) {
  const [sel, setSel] = useState<FeelingSel>(null);
  const d = useLiveQuery(async () => {
    const first = month + '-01', last = month + '-31';
    const [moments, rows, entries, people] = await Promise.all([db.moments.where('day').between(first, last, true, true).toArray(), db.days.where('day').between(first, last, true, true).toArray(), db.entries.where('day').between(first, last, true, true).toArray(), db.people.toArray()]);
    const hidden = new Set(entries.filter(e => e.marks.priv).map(e => e.id)), shown = locked ? moments.filter(m => m.entryId == null || !hidden.has(m.entryId)) : moments;
    const fams = dayFamilies(moments, rows);
    return { moments, stats: monthStats(month, moments), words: wordCounts(shown), mix: hourMix(moments), often: oftenWith(locked ? entries.filter(e => !e.marks.priv) : entries, fams).map(o => ({ ...o, families: o.families.length ? o.families : [tagFamily(o.tag, {}, 'calm')] })), withPeople: peopleWith(entries, fams, people) };
  }, [month, locked]);
  if (!d) return null;
  const daysWith = !sel ? [] : [...new Set(d.moments.filter(m => (sel.kind === 'fam' ? m.family === sel.key || m.second === sel.key : m.word === sel.key || !!m.about?.split(/, | /).includes(sel.key))).map(m => m.day))].sort();
  return <FeelingsView month={month} {...d} sel={sel} onSel={setSel} daysWith={daysWith} />;
}
