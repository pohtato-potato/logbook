import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../db/db';
import { addDays, dayKey, parseDay } from '../domain/day';
import { FAMILY_NAME, type Family } from '../vocab/vocab';
import { drawSmall } from '../draw/forms';
import { Scene } from '../draw/Canvas';
import { Icon } from '../ui/Icons';
import { Tabs } from '../ui/Tabs';
import { Sheet } from '../ui/Sheet';
import { useLook } from '../ui/Look';
import { go } from '../router';
import { suggestedOverall } from './Today';
import { useNow } from '../ui/useNow';
import type { Span } from '../db/types';
import { dateRange } from '../domain/entryText';

/* A kept day: its main feeling (absent when only lines were kept), how many moments, and whether anything was marked a first. */
type DayInfo = { family?: Family; count: number; first: boolean };
const monthLabel = (month: string) => parseDay(month + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const shift = (month: string, n: number) => { const d = parseDay(month + '-01'); d.setMonth(d.getMonth() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
/* Blanks before the 1st so the grid starts on Monday, then every day of the month. */
export function monthGrid(month: string): (string | null)[] {
  const first = parseDay(month + '-01'), lead = (first.getDay() + 6) % 7, out: (string | null)[] = Array(lead).fill(null);
  for (let d = month + '-01'; d.startsWith(month); d = addDays(d, 1)) out.push(d);
  return out;
}
function Glyph({ family, label }: { family: Family; label: string }) {
  const look = useLook();
  return <Scene label={label} draw={(ctx, w, h) => drawSmall(ctx, look, family, w / 2, h / 2, Math.min(w, h) * 0.4)} />;
}
const dateWords = (d: string) => parseDay(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
/* The month: each kept day shows the form of its main feeling, so it reads without colour. */
export function CalendarView({ month, today, days, spans = [], open, onOpen, onMonth }: { month: string; today: string; days: Record<string, DayInfo>; spans?: Span[]; open: string | null; onOpen(d: string | null): void; onMonth(m: string): void }) {
  const { pal } = useLook(), spanOf = (d: string) => spans.find(s => s.from <= d && d <= s.to), band = (sp?: Span) => (sp ? { ['--sc' as string]: pal[sp.family] } : undefined);
  const grid = monthGrid(month), kept = Object.keys(days).filter(d => d.startsWith(month)).sort(), fams = [...new Set(kept.map(d => days[d].family).filter((f): f is Family => !!f))];
  const cell = (d: string | null, i: number) => {
    if (!d) return <span key={'b' + i} className="mc blank" />;
    const n = +d.slice(8), info = days[d], sp = spanOf(d), inspan = sp ? ' inspan' : '';
    if (!info) return <span key={d} className={'mc' + inspan + (d > today ? ' future' : '') + (d === today ? ' today' : '')} style={band(sp)}><span className="dn">{n}</span></span>;
    const label = info.family ? `${dateWords(d)}: mostly ${FAMILY_NAME[info.family].toLowerCase()}, ${info.count} moment${info.count === 1 ? '' : 's'}${info.first ? ', a first' : ''}` : `${dateWords(d)}: lines kept, no feelings named${info.first ? ', a first' : ''}`;
    const said = label + (sp ? `, part of ${sp.name}` : '');
    return <button key={d} type="button" className={'mc' + inspan + (d === today ? ' today' : '')} style={band(sp)} aria-label={said} onClick={() => onOpen(d)}>
      <span className="dn">{n}</span>{info.family ? <Glyph family={info.family} label="" /> : <span className="lineonly" aria-hidden="true" />}{info.first && <span className="mk"><Icon name="first" /></span>}</button>;
  };
  const i = open ? kept.indexOf(open) : -1, prev = i > 0 ? kept[i - 1] : null, next = i >= 0 && i < kept.length - 1 ? kept[i + 1] : null;
  const short = (d: string) => parseDay(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return <div className="scr"><div className="content scroll">
    <header className="thead row2"><button type="button" className="iconbtn" aria-label="Previous month" onClick={() => onMonth(shift(month, -1))}><Icon name="back" /></button>
      <h1 className="tdate sm">{monthLabel(month)}</h1><button type="button" className="iconbtn" aria-label="Next month" onClick={() => onMonth(shift(month, 1))}><Icon name="next" /></button></header>
    <div className="ctabs" role="tablist" aria-label="Calendar views"><button type="button" role="tab" aria-selected="true" className="on">Days</button></div>
    <p className="hint">Each day shows the form of its main feeling. <Icon name="first" /> marks a first.</p>
    {fams.length > 0 && <div className="formkey">{fams.map(f => <span key={f}><Glyph family={f} label="" />{FAMILY_NAME[f]}</span>)}</div>}
    <div className="cal" role="group" aria-label={monthLabel(month)}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, k) => <span key={'h' + k} className="mh" aria-hidden="true">{d}</span>)}{grid.map(cell)}</div>
    {spans.length > 0 && <section className="panel"><h2 className="lbl">Spans this month</h2>{spans.map(sp => <p key={sp.id} className="entry spanline"><i style={{ background: pal[sp.family] }} aria-hidden="true" />{sp.name}, {dateRange(sp.from, sp.to)}</p>)}<p className="hint">A band along the top of a day means it is part of a span.</p></section>}
    {!kept.length && <p className="entry">Nothing kept this month yet.</p>}
  </div>
  {open && days[open] && <Sheet label={dateWords(open)} onClose={() => onOpen(null)}>
    <div className="row3"><p className="tdate sm">{dateWords(open)}</p><button type="button" className="iconbtn" aria-label="Close" onClick={() => onOpen(null)}><Icon name="close" /></button></div>
    <p className="entry">{days[open].family ? `Mostly ${FAMILY_NAME[days[open].family!].toLowerCase()}, ${days[open].count} moment${days[open].count === 1 ? '' : 's'}${days[open].first ? ', and a first' : ''}.` : `Lines kept, no feelings named${days[open].first ? ', and a first' : ''}.`}</p>
    <div className="btnrow">{prev && <button type="button" className="btn" aria-label={`Day before, ${dateWords(prev)}`} onClick={() => onOpen(prev)}><Icon name="back" />{short(prev)}</button>}
      <button type="button" className="btn primary" onClick={() => go({ name: 'day', day: open })}>Open this day</button>
      {next && <button type="button" className="btn" aria-label={`Day after, ${dateWords(next)}`} onClick={() => onOpen(next)}>{short(next)}<Icon name="next" /></button>}</div>
  </Sheet>}
  <Tabs current="cal" /></div>;
}
export function Calendar({ month }: { month?: string }) {
  const today = dayKey(useNow()), m = month ?? today.slice(0, 7), [open, setOpen] = useState<string | null>(null);
  const { days, spans } = useLiveQuery(async () => {
    const first = m + '-01', last = m + '-31';
    const [moments, entries, rows] = await Promise.all([db.moments.where('day').between(first, last, true, true).toArray(), db.entries.where('day').between(first, last, true, true).toArray(), db.days.where('day').between(first, last, true, true).toArray()]);
    return { days: buildMonthDays(moments, entries, rows), spans: (await db.spans.toArray()).filter(sp => sp.from <= last && sp.to >= first).sort((a, b) => a.from.localeCompare(b.from)) };
  }, [m]) ?? { days: {}, spans: [] };
  return <CalendarView month={m} today={today} days={days} spans={spans} open={open} onOpen={setOpen} onMonth={mm => go({ name: 'cal', month: mm })} />;
}

/* Every day with anything kept: moments, a set day overall, or just lines. */
export function buildMonthDays(moments: { day: string; family: Family; at: number; word: string; strength: number }[], entries: { day: string; marks: { first?: boolean } }[], rows: { day: string; overall?: { family: Family } }[]): Record<string, DayInfo> {
  const out: Record<string, DayInfo> = {};
  for (const d of new Set([...moments.map(x => x.day), ...entries.map(e => e.day), ...rows.filter(r => r.overall).map(r => r.day)])) {
    const ms = moments.filter(x => x.day === d), fam = rows.find(r => r.day === d)?.overall?.family ?? suggestedOverall(ms)?.family;
    const info: DayInfo = { count: ms.length, first: entries.some(e => e.day === d && !!e.marks.first) };
    if (fam) info.family = fam;
    out[d] = info;
  }
  return out;
}
