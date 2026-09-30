import type { KeyboardEvent, MouseEvent } from 'react';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { parseDay } from '../../domain/day';
import { dayFamilies, maskMoments, yearDays, yearSummary } from '../../domain/looking';
import { drawSmall } from '../../draw/forms';
import { Scene } from '../../draw/Canvas';
import { drawYearPixels, drawYearRing, monthLengths, pixelHit, ringHit, type YearDay } from '../../draw/year';
import { FAMILIES, FAMILY_NAME, type Family } from '../../vocab/vocab';
import { Icon } from '../../ui/Icons';
import { Sheet } from '../../ui/Sheet';
import { useLook } from '../../ui/Look';
import { go } from '../../router';

type Style = 'ring' | 'pixels';
/* Where an arrow key moves the chosen day. The first press picks the starting day; on the ring it's days and weeks, on the pixels grid (a column per month) a day up or down and a month across. */
export function stepPick(pick: number | null, key: string, style: Style, len: number, start: number, year = 2001): number | null {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) return null;
  if (pick == null) return Math.max(0, Math.min(len - 1, start));
  const clamp = (i: number) => Math.max(0, Math.min(len - 1, i));
  if (style === 'ring') return clamp(pick + ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>)[key]);
  if (key === 'ArrowUp' || key === 'ArrowDown') return clamp(pick + (key === 'ArrowDown' ? 1 : -1));
  const lens = monthLengths(year); let mo = 0, d = pick; while (mo < 11 && d >= lens[mo]) { d -= lens[mo]; mo++; }
  const to = mo + (key === 'ArrowRight' ? 1 : -1); if (to < 0 || to > 11) return pick;
  return lens.slice(0, to).reduce((a, b) => a + b, 0) + Math.min(d, lens[to] - 1);
}
const words = (d: string) => parseDay(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
const short = (d: string) => parseDay(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
function Glyph({ family }: { family: Family }) { const look = useLook(); return <Scene label="" draw={(ctx, w, h) => drawSmall(ctx, look, family, w / 2, h / 2, Math.min(w, h) * 0.4)} />; }
/* The year as a ring or as pixels. Tap a day or move with the arrow keys; a sheet reads it, with the day before and after. */
export function YearView({ year, days, today, style, pick, onStyle, onPick, onYear, onOpen, wordsOf }: { year: number; days: YearDay[]; today: string; style: Style; pick: number | null;
  onStyle(s: Style): void; onPick(i: number | null): void; onYear(y: number): void; onOpen(day: string): void; wordsOf(day: string): string[] }) {
  const look = useLook(), todayI = days.findIndex(d => d.day === today), kept = days.filter(d => d.family);
  const main = FAMILIES.map(f => [f, kept.filter(d => d.family === f).length] as const).sort((a, b) => b[1] - a[1])[0];
  const label = `${year} as ${style === 'ring' ? 'a ring' : 'a grid'} of days: ${kept.length} ${kept.length === 1 ? 'day' : 'days'} kept${kept.length ? `, mostly ${FAMILY_NAME[main[0]].toLowerCase()}` : ''}. Tap a day, or use the arrow keys, to read it.`;
  const tap = (e: MouseEvent<HTMLDivElement>) => { const c = e.currentTarget.querySelector('canvas'); if (!c) return; const r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const i = style === 'ring' ? ringHit(x, y, r.width, r.height, days) : pixelHit(x, y, r.width, r.height, year); onPick(i >= 0 ? i : null); };
  const key = (e: KeyboardEvent<HTMLDivElement>) => { const next = stepPick(pick, e.key, style, days.length, Math.max(0, todayI), year);
    if (next != null) { e.preventDefault(); onPick(next); }
    else if (e.key === 'Enter' && pick != null && days[pick]?.family) onOpen(days[pick].day); else if (e.key === 'Escape') onPick(null); };
  const p = pick != null ? days[pick] : undefined, fams = [...new Set(kept.map(d => d.family!))];
  return <>
    <div className="row2 yearnav">{<button type="button" className="iconbtn" aria-label="Previous year" onClick={() => onYear(year - 1)}><Icon name="back" /></button>}
      <div className="ystyle" role="group" aria-label="Year style">{([['ring', 'Ring'], ['pixels', 'Pixels']] as const).map(([k, l]) => <button key={k} type="button" className={'chip' + (style === k ? ' on ink' : '')} aria-pressed={style === k} onClick={() => onStyle(k)}>{l}</button>)}</div>
      {year < Number(today.slice(0, 4)) ? <button type="button" className="iconbtn" aria-label="Next year" onClick={() => onYear(year + 1)}><Icon name="next" /></button> : <span className="iconbtn" aria-hidden="true" />}</div>
    <div className="yearpad" tabIndex={0} role="group" aria-label={label} onClick={tap} onKeyDown={key}>
      <Scene className="ycanvas" label="" draw={(ctx, w, h) => (style === 'ring' ? drawYearRing : drawYearPixels)(ctx, look, w, h, days, todayI, pick ?? -1)} /></div>
    <p className="hint">Tap any day, or use the arrow keys, to read it.</p>
    <p className="entry">{yearSummary(days)}</p>
    {fams.length > 0 && <div className="formkey">{fams.map(f => <span key={f}><Glyph family={f} />{FAMILY_NAME[f]}</span>)}</div>}
    {p && pick != null && <Sheet label={words(p.day)} onClose={() => onPick(null)}><div onKeyDown={key}>
      <div className="row3"><p className="tdate sm">{words(p.day)}</p><button type="button" className="iconbtn" aria-label="Close" onClick={() => onPick(null)}><Icon name="close" /></button></div>
      {p.family ? <div className="yp-row"><Glyph family={p.family} /><p className="entry">Mostly {FAMILY_NAME[p.family].toLowerCase()}{wordsOf(p.day).length ? `: ${wordsOf(p.day).join(', then ')}` : ''}.</p></div>
        : <p className="entry">{p.day > today ? 'Not written yet. This day is still ahead.' : 'Nothing kept on this day.'}</p>}
      <div className="btnrow">{pick > 0 && <button type="button" className="btn" aria-label={`Day before, ${words(days[pick - 1].day)}`} onClick={() => onPick(pick - 1)}><Icon name="back" />{short(days[pick - 1].day)}</button>}
        {p.family && <button type="button" className="btn primary" onClick={() => onOpen(p.day)}>Open this day</button>}
        {pick < days.length - 1 && <button type="button" className="btn" aria-label={`Day after, ${words(days[pick + 1].day)}`} onClick={() => onPick(pick + 1)}>{short(days[pick + 1].day)}<Icon name="next" /></button>}</div>
    </div></Sheet>}
  </>;
}
export function Year({ year, today, locked = false }: { year: number; today: string; locked?: boolean }) {
  const [style, setStyle] = useState<Style>(() => { try { return localStorage.getItem('logbook-year-style') === 'pixels' ? 'pixels' : 'ring'; } catch { return 'ring'; } });
  const [pick, setPick] = useState<number | null>(null);
  const d = useLiveQuery(async () => {
    const from = `${year}-01-01`, to = `${year}-12-31`;
    const [all, rows, entries] = await Promise.all([db.moments.where('day').between(from, to, true, true).toArray(), db.days.where('day').between(from, to, true, true).toArray(), db.entries.where('day').between(from, to, true, true).toArray()]);
    const moments = maskMoments(all, entries, locked);
    const byDay = new Map<string, string[]>(); [...moments].sort((a, b) => a.at - b.at).forEach(m => byDay.set(m.day, [...(byDay.get(m.day) ?? []), m.word]));
    return { days: yearDays(year, dayFamilies(moments, rows)), byDay };
  }, [year, locked]);
  if (!d) return null;
  return <YearView year={year} days={d.days} today={today} style={style} pick={pick} onPick={setPick} onOpen={day => go({ name: 'day', day })} wordsOf={day => [...new Set(d.byDay.get(day) ?? [])].slice(0, 4)}
    onStyle={s => { setStyle(s); try { localStorage.setItem('logbook-year-style', s); } catch { /* not remembered */ } }}
    onYear={y => { setPick(null); go({ name: 'cal', month: `${y}-${today.slice(5, 7)}`, tab: 'year' }); }} />;
}
