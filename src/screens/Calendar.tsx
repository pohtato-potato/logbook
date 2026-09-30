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

type DayInfo = { family: Family; count: number; first: boolean };
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
export function CalendarView({ month, today, days, open, onOpen, onMonth }: { month: string; today: string; days: Record<string, DayInfo>; open: string | null; onOpen(d: string | null): void; onMonth(m: string): void }) {
  const grid = monthGrid(month), kept = Object.keys(days).filter(d => d.startsWith(month)).sort(), fams = [...new Set(kept.map(d => days[d].family))];
  const cell = (d: string | null, i: number) => {
    if (!d) return <span key={'b' + i} className="mc blank" />;
    const n = +d.slice(8), info = days[d];
    if (!info) return <span key={d} className={'mc' + (d > today ? ' future' : '') + (d === today ? ' today' : '')}><span className="dn">{n}</span></span>;
    const label = `${dateWords(d)}: mostly ${FAMILY_NAME[info.family].toLowerCase()}, ${info.count} moment${info.count === 1 ? '' : 's'}${info.first ? ', a first' : ''}`;
    return <button key={d} type="button" className={'mc' + (d === today ? ' today' : '')} aria-label={label} onClick={() => onOpen(d)}>
      <span className="dn">{n}</span><Glyph family={info.family} label="" />{info.first && <span className="mk"><Icon name="first" /></span>}</button>;
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
    {!kept.length && <p className="entry">Nothing kept this month yet.</p>}
  </div>
  {open && days[open] && <Sheet label={dateWords(open)} onClose={() => onOpen(null)}>
    <div className="row3"><p className="tdate sm">{dateWords(open)}</p><button type="button" className="iconbtn" aria-label="Close" onClick={() => onOpen(null)}><Icon name="close" /></button></div>
    <p className="entry">Mostly {FAMILY_NAME[days[open].family].toLowerCase()}, {days[open].count} moment{days[open].count === 1 ? '' : 's'}{days[open].first ? ', and a first' : ''}.</p>
    <div className="btnrow">{prev && <button type="button" className="btn" aria-label={`Day before, ${dateWords(prev)}`} onClick={() => onOpen(prev)}><Icon name="back" />{short(prev)}</button>}
      <button type="button" className="btn primary" onClick={() => go({ name: 'day', day: open })}>Open this day</button>
      {next && <button type="button" className="btn" aria-label={`Day after, ${dateWords(next)}`} onClick={() => onOpen(next)}>{short(next)}<Icon name="next" /></button>}</div>
  </Sheet>}
  <Tabs current="cal" /></div>;
}
export function Calendar({ month }: { month?: string }) {
  const today = dayKey(new Date()), m = month ?? today.slice(0, 7), [open, setOpen] = useState<string | null>(null);
  const days = useLiveQuery(async () => {
    const first = m + '-01', last = m + '-31';
    const [moments, entries, rows] = await Promise.all([db.moments.where('day').between(first, last, true, true).toArray(), db.entries.where('day').between(first, last, true, true).toArray(), db.days.where('day').between(first, last, true, true).toArray()]);
    const out: Record<string, DayInfo> = {};
    for (const d of new Set([...moments.map(x => x.day), ...rows.filter(r => r.overall).map(r => r.day)])) {
      const ms = moments.filter(x => x.day === d), row = rows.find(r => r.day === d), fam = row?.overall?.family ?? suggestedOverall(ms)?.family;
      if (fam) out[d] = { family: fam, count: ms.length, first: entries.some(e => e.day === d && e.marks.first) };
    }
    return out;
  }, [m]) ?? {};
  return <CalendarView month={m} today={today} days={days} open={open} onOpen={setOpen} onMonth={mm => go({ name: 'cal', month: mm })} />;
}
