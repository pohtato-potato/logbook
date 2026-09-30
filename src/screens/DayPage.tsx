import type { ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { getSettings } from '../db/actions';
import type { DayRow, Entry, Moment } from '../db/types';
import { parseDay, timeLabel } from '../domain/day';
import { FAMILY_NAME, ladderName, type Family } from '../vocab/vocab';
import { drawBloomLine, drawScoreLine, type DayMoment } from '../draw/day';
import { Scene } from '../draw/Canvas';
import { Form } from '../ui/Form';
import { Icon } from '../ui/Icons';
import { Tabs } from '../ui/Tabs';
import { useLook } from '../ui/Look';
import { RichText, suggestedOverall } from './Today';

/* Hours from midnight; moments before 4 am belong to the day before, so they sit after its evening. */
export const toDayMoments = (ms: Moment[]): DayMoment[] => [...ms].sort((a, b) => a.at - b.at).map(m => {
  const d = new Date(m.at), h = d.getHours() + d.getMinutes() / 60;
  return { h: h < 4 ? h + 24 : h, family: m.family, second: m.second, strength: m.strength };
});
/* The day page: the picture on top, and the story underneath as the one place each moment is read. */
export function DayPageView({ day, style, entries, moments, overall, own }: { day: string; style: 'bloom' | 'score'; entries: Entry[]; moments: Moment[]; overall?: DayRow['overall']; own: Record<string, Family> }) {
  const look = useLook(), dms = toDayMoments(moments), ov = overall ?? (() => { const s = suggestedOverall(moments); return s ? { ...s, set: false } : undefined; })();
  const fam: Family = ov?.family ?? dms[0]?.family ?? 'calm';
  const items: { at: number; node: ReactNode }[] = [
    ...moments.map(m => ({ at: m.at, node: <div className="st-item" key={'m' + m.id}><Form family={m.family} second={m.second} label={FAMILY_NAME[m.family]} /><div className="st-body">
      <p className="st-time">{timeLabel(new Date(m.at))}</p><p className="st-word">{m.word}{m.about && <span> {m.about}</span>}</p>
      <p className="st-wx">{FAMILY_NAME[m.family]}{m.second ? ` with ${FAMILY_NAME[m.second].toLowerCase()}` : ''}, like {ladderName(m.family, m.strength).toLowerCase()}</p></div></div> })),
    ...entries.map(e => ({ at: e.at + 1, node: <div className="st-item" key={'e' + e.id}><span aria-hidden="true" /><div className="st-body"><RichText text={e.text} own={own} onOpenFeeling={() => {}} /></div></div> })),
  ].sort((a, b) => a.at - b.at);
  const empty = !moments.length && !entries.length;
  return <div className={'scr' + (style === 'score' ? ' ds-score' : '')}><div className="content scroll">
    <header className="thead onwall"><button type="button" className="back" aria-label="Back" onClick={() => history.back()}><Icon name="back" /></button>
      <h1 className="tdate sm">{parseDay(day).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h1></header>
    {empty ? <p className="entry">Nothing kept on this day.</p> : <>
      <div className={'dhero ' + (style === 'bloom' ? 'bloomline' : '')}>
        <Scene animate className={style === 'score' ? 'sc-staff' : undefined} label="The day's colours, from morning to night"
          draw={(ctx, w, h, t) => style === 'bloom' ? drawBloomLine(ctx, look, w, h, t, dms, fam) : drawScoreLine(ctx, look, w, h, t, dms)} />
        {style === 'bloom' && ov && <div className="dial-center"><b>{ladderName(ov.family, ov.strength)}</b><span>{FAMILY_NAME[ov.family].toLowerCase()}, overall</span></div>}
      </div>
      {style === 'score' && <p className="hint">Placed only by time. Bigger marks were felt more strongly.</p>}
      <section className="panel story" aria-label="The day, moment by moment" style={{ ['--daygrad' as string]: `linear-gradient(${moments.map(m => look.pal[m.family]).join(', ') || look.pal[fam]}, ${look.pal[fam]})` }}>{items.map(i => i.node)}</section>
    </>}
  </div><Tabs current="cal" /></div>;
}
export function DayPage({ day }: { day: string }) {
  const data = useLiveQuery(async () => ({
    entries: await db.entries.where('day').equals(day).toArray(), moments: await db.moments.where('day').equals(day).toArray(), row: await db.days.get(day), settings: await getSettings(db),
    own: Object.fromEntries((await db.words.toArray()).map(w => [w.word, w.family])) as Record<string, Family>,
  }), [day]);
  if (!data) return <div className="scr" />;
  return <DayPageView day={day} style={data.settings.dayStyle} entries={data.entries} moments={data.moments} overall={data.row?.overall} own={data.own} />;
}
