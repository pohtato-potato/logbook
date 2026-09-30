import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { parseDay } from '../../domain/day';
import { dayFamilies } from '../../domain/looking';
import { drawBloomLine, type DayMoment } from '../../draw/day';
import { Scene } from '../../draw/Canvas';
import { FAMILY_NAME, type Family } from '../../vocab/vocab';
import { useLook } from '../../ui/Look';
import { go } from '../../router';
import { monthGrid } from '../Calendar';
import { toDayMoments } from '../DayPage';

export type GalleryCell = { overall: Family; moments: DayMoment[] };
const dateWords = (d: string) => parseDay(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
/* Each day of the month as a small bloom: forms sit at the hour they were felt; the centre is the day overall. */
export function GalleryView({ month, today, cells, onOpen }: { month: string; today: string; cells: Record<string, GalleryCell>; onOpen(day: string): void }) {
  const look = useLook(), any = Object.keys(cells).some(d => d.startsWith(month));
  const cell = (d: string | null, i: number) => {
    if (!d) return <span key={'b' + i} className="gc2 blank" />;
    const c = cells[d], n = +d.slice(8), today_ = d === today ? ' today' : '';
    if (!c) return <span key={d} className={'gc2 future' + today_}><span className="gd">{n}</span></span>;
    return <button key={d} type="button" className={'gc2' + today_} aria-label={`${dateWords(d)}: mostly ${FAMILY_NAME[c.overall].toLowerCase()}, ${c.moments.length} moment${c.moments.length === 1 ? '' : 's'}`} onClick={() => onOpen(d)}>
      <Scene label="" draw={(ctx, w, h) => drawBloomLine(ctx, look, w, h, 0, c.moments, c.overall, { small: true })} /><span className="gd">{n}</span></button>;
  };
  return <>
    <p className="hint">Each day as a small bloom: the forms sit at the hour you felt them, the centre is the day overall. Tap one to read it.</p>
    <div className="gal" role="group" aria-label={parseDay(month + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}>
      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, k) => <span key={'h' + k} className="mh" aria-hidden="true">{d}</span>)}{monthGrid(month).map(cell)}</div>
    {!any && <p className="entry">Nothing kept this month yet.</p>}
  </>;
}
export function Gallery({ month, today }: { month: string; today: string }) {
  const cells = useLiveQuery(async () => {
    const first = month + '-01', last = month + '-31';
    const [moments, rows] = await Promise.all([db.moments.where('day').between(first, last, true, true).toArray(), db.days.where('day').between(first, last, true, true).toArray()]);
    const fams = dayFamilies(moments, rows), out: Record<string, GalleryCell> = {};
    fams.forEach((f, d) => { out[d] = { overall: f.family, moments: toDayMoments(moments.filter(m => m.day === d)) }; });
    return out;
  }, [month]);
  return cells ? <GalleryView month={month} today={today} cells={cells} onOpen={day => go({ name: 'day', day })} /> : null;
}
