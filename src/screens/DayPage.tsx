import type { ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { getSettings } from '../db/actions';
import type { DayRow, Entry, Moment } from '../db/types';
import { parseDay, timeLabel } from '../domain/day';
import { EMPTY_LOOKUP, type Lookup } from '../domain/entryText';
import { loadLookup } from '../db/lookup';
import { FAMILY_NAME, ladderName, type Family } from '../vocab/vocab';
import { drawBloomLine, drawScoreLine, type DayMoment } from '../draw/day';
import { Scene } from '../draw/Canvas';
import { Form } from '../ui/Form';
import { Icon } from '../ui/Icons';
import { Tabs } from '../ui/Tabs';
import { useLook } from '../ui/Look';
import { suggestedOverall } from './Today';
import { KeptCard } from './KeptCard';
import { FeelingCard } from './FeelingCard';
import { EntryMenu } from './EntryMenu';
import { PRIVATE_FEELING, maskMoments } from '../domain/looking';
import { echoFor } from '../domain/almanac';
import { usePrivacy } from '../ui/Privacy';
import { StampsPanelView, type StampsProps } from './Stamps';
import { useStamps } from '../ui/useStamps';
import { useState } from 'react';
import { go } from '../router';

/* Hours from midnight; moments before 4 am belong to the day before, so they sit after its evening. */
export const toDayMoments = (ms: Moment[]): DayMoment[] => [...ms].sort((a, b) => a.at - b.at).map(m => {
  const d = new Date(m.at), h = d.getHours() + d.getMinutes() / 60;
  return { h: h < 4 ? h + 24 : h, family: m.family, second: m.second, strength: m.strength };
});
/* The day page: the picture on top, and the story underneath as the one place each moment is read. */
export function DayPageView({ day, style, entries, moments, overall, own, lookup = EMPTY_LOOKUP, thumbs, onOpenFeeling, onEntryMenu, stamps, echoes }: { day: string; style: 'bloom' | 'score'; entries: Entry[]; moments: Moment[]; overall?: DayRow['overall']; own: Record<string, Family>; lookup?: Lookup; thumbs?: Map<number, Blob>; onOpenFeeling?(word: string, entryId: number): void; onEntryMenu?(id: number): void; stamps?: StampsProps; echoes?: Map<number, { day: string; word: string }> }) {
  const look = useLook(), dms = toDayMoments(moments), ov = overall ?? (() => { const s = suggestedOverall(moments); return s ? { ...s, set: false } : undefined; })();
  const fam: Family = ov?.family ?? dms[0]?.family ?? 'calm';
  const items: { at: number; node: ReactNode }[] = [
    ...moments.map(m => ({ at: m.at, node: <div className="st-item" key={'m' + m.id}><Form family={m.family} second={m.second} label={FAMILY_NAME[m.family]} /><div className="st-body">
      <p className="st-time">{timeLabel(new Date(m.at))}</p><p className="st-word">{m.word}{m.about && <span> {m.about}</span>}</p>
      <p className="st-wx">{FAMILY_NAME[m.family]}{m.second ? ` with ${FAMILY_NAME[m.second].toLowerCase()}` : ''}, like {ladderName(m.family, m.strength).toLowerCase()}</p>
      {echoes?.get(m.id!) && <button type="button" className="echo" onClick={() => go({ name: 'day', day: echoes.get(m.id!)!.day })}>Echo: you felt {echoes.get(m.id!)!.word} on {parseDay(echoes.get(m.id!)!.day).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} too</button>}</div></div> })),
    ...entries.map(e => ({ at: e.at + 1, node: <div className="st-item" key={'e' + e.id}><span aria-hidden="true" /><div className="st-body"><KeptCard entry={e} lookup={lookup} own={own} thumbs={thumbs} onMenu={onEntryMenu} onOpenFeeling={w => onOpenFeeling?.(w, e.id!)} onOpenTag={tag => go({ name: 'tag', tag })} onOpenPerson={i => go({ name: 'person', id: lookup.people.get(i)?.id ?? i.toLowerCase() })} /></div></div> })),
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
    {stamps && <StampsPanelView {...stamps} title="The day’s stamps" />}
  </div><Tabs current="cal" /></div>;
}
/* Each moment's echo: the latest earlier day with the same feeling. Private feelings (while locked) get none. */
const echoesOf = (ms: Moment[], all: Moment[], entries: Entry[]) => new Map(ms.filter(m => m.word !== PRIVATE_FEELING).flatMap(m => { const e = echoFor(m, all, entries); return e ? [[m.id!, e] as const] : []; }));
export function DayPage({ day }: { day: string }) {
  const { locked } = usePrivacy();
  const [card, setCard] = useState<{ word: string; id: number } | null>(null), [menu, setMenu] = useState<number | null>(null), [open, setOpen] = useState(false), st = useStamps(day);
  const data = useLiveQuery(async () => ({
    all: await db.moments.where('day').below(day).toArray(), allEntries: await db.entries.where('day').below(day).toArray(),
    entries: await db.entries.where('day').equals(day).toArray(), moments: await db.moments.where('day').equals(day).toArray(), row: await db.days.get(day), settings: await getSettings(db),
    own: Object.fromEntries((await db.words.toArray()).map(w => [w.word, w.family])) as Record<string, Family>, lookup: await loadLookup(db),
    thumbs: new Map((await db.photos.where('day').equals(day).toArray()).map(ph => [ph.id!, ph.thumb])),
  }), [day]);
  if (!data) return <div className="scr" />;
  return <><DayPageView day={day} style={data.settings.dayStyle} entries={data.entries} moments={maskMoments(data.moments, data.entries, locked)} echoes={echoesOf(maskMoments(data.moments, data.entries, locked), data.all, data.allEntries)} overall={data.row?.overall} own={data.own} lookup={data.lookup} thumbs={data.thumbs} onOpenFeeling={(word, id) => setCard({ word, id })} onEntryMenu={setMenu}
      stamps={{ list: st.list, status: st.status, open, onToggle: () => setOpen(!open), onWhere: () => {}, canLocate: false, placeSource: st.pos?.source, isToday: false }} />
    {menu != null && <EntryMenu id={menu} onClose={() => setMenu(null)} />}
    {card && <FeelingCard word={card.word} src={{ kind: 'entry', id: card.id }} own={data.own} onClose={() => setCard(null)} />}</>;
}
