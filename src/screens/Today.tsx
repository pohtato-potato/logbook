import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { confirmOverall, getSettings, removeEntry } from '../db/actions';
import type { DayRow, Entry, Moment } from '../db/types';
import { dayKey, isNight, timeLabel } from '../domain/day';
import { tokenize } from '../domain/line';
import { tagFamily } from '../domain/colour';
import { FAMILY_NAME, feelingOf, ladderName, type Family } from '../vocab/vocab';
import { Form } from '../ui/Form';
import { FeelingChip, TagChip } from '../ui/Chips';
import { Icon } from '../ui/Icons';
import { Tabs } from '../ui/Tabs';
import { Sheet } from '../ui/Sheet';
import { useUndo } from '../ui/Undo';
import { go } from '../router';
import { VOICES } from '../domain/voices';
import { LineWriter } from './LineWriter';
import { FeelingCard, type FeelingSource } from './FeelingCard';

export { Form } from '../ui/Form';
/* The day overall, suggested from the most-felt family and its latest word, until it's set. */
export function suggestedOverall(moments: Moment[]) {
  if (!moments.length) return undefined;
  const n = new Map<Family, number>(); moments.forEach(m => n.set(m.family, (n.get(m.family) ?? 0) + 1));
  const top = [...n.entries()].sort((a, b) => b[1] - a[1])[0][0], latest = [...moments].filter(m => m.family === top).sort((a, b) => b.at - a.at)[0];
  return { word: latest.word, family: top, strength: 3 };
}
/* A kept line, with tags, people and feelings as chips. Unknown :words stay plain text. */
export function RichText({ text, own, onOpenFeeling, tagHistory = {}, todayFamily = 'calm' }: { text: string; own: Record<string, Family>; onOpenFeeling: (w: string) => void; tagHistory?: Record<string, Family[]>; todayFamily?: Family }) {
  const parts: ReactNode[] = []; let i = 0;
  tokenize(text).forEach((t, k) => {
    parts.push(text.slice(i, t.start));
    if (t.kind === 'tag') parts.push(<TagChip key={k} tag={t.value} family={tagFamily(t.value, tagHistory, todayFamily)} />);
    else if (t.kind === 'person') parts.push(<span key={k} className="mention"><b aria-hidden="true">@</b>{t.value}</span>);
    else { const x = feelingOf(t.value, own); parts.push(x ? <FeelingChip key={k} word={x.w} family={x.family} onOpen={() => onOpenFeeling(x.w)} /> : t.raw); }
    i = t.end;
  });
  parts.push(text.slice(i));
  return <p className="entry">{parts}</p>;
}
const MARK_LABEL = { first: 'First', gift: 'Gift', priv: 'Private', quiet: 'Don’t bring back' } as const;
export type TodayProps = { now: Date; greeting: string; night: boolean; entries: Entry[]; moments: Moment[]; overall?: DayRow['overall']; suggested?: { word: string; family: Family; strength: number }; grateful?: string; foldedOpen: boolean;
  own?: Record<string, Family>; tagHistory?: Record<string, Family[]>;
  onToggleFold(): void; onConfirmOverall(): void; onChangeOverall(): void; onOpenFeeling(word: string, src: FeelingSource): void; onEntryMenu(id: number): void; writer: ReactNode };
/* Today. At night (12 to 5 am) it holds only the line, inner weather and the day overall; the rest folds into one row. */
export function TodayView(p: TodayProps) {
  const own = p.own ?? {}, ov = p.overall ?? (p.suggested ? { ...p.suggested, set: false } : undefined), todayFamily = p.suggested?.family ?? 'calm';
  const header = <header className="thead onwall"><div className="hrow"><div className="hdate"><h1 className="tdate">{p.now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</h1></div>
    <div className="hbtns"><button type="button" className="iconbtn" aria-label="Settings" onClick={() => go({ name: 'settings' })}><Icon name="sliders" /></button></div></div><p className="voice">{p.greeting}</p></header>;
  const kept = p.entries.length ? <section className="panel"><h2 className="lbl">Kept today</h2>{[...p.entries].sort((a, b) => b.at - a.at).map(e => <div className="ent" key={e.id}>
    <div className="ent-top"><div className="ent-body"><RichText text={e.text} own={own} tagHistory={p.tagHistory} todayFamily={todayFamily} onOpenFeeling={w => p.onOpenFeeling(w, { kind: 'entry', id: e.id! })} /></div>
      <button type="button" className="iconbtn sm" aria-label="Change or remove this entry" onClick={() => p.onEntryMenu(e.id!)}><Icon name="more" /></button></div>
    <div className="ent-meta"><span>{timeLabel(new Date(e.at))}</span>{(Object.keys(MARK_LABEL) as (keyof typeof MARK_LABEL)[]).filter(k => e.marks[k]).map(k => <span key={k} className="mpill">{MARK_LABEL[k]}</span>)}</div></div>)}</section> : null;
  const weather = <section className="panel" aria-labelledby="h-weather"><h2 className="lbl" id="h-weather">Inner weather</h2>
    {p.moments.length ? <div className="moms" role="list">{[...p.moments].sort((a, b) => a.at - b.at).map(m => <button key={m.id} type="button" className="mom" onClick={() => p.onOpenFeeling(m.word, { kind: 'moment', id: m.id! })} aria-label={`${timeLabel(new Date(m.at))}, ${m.word}. Open its card`}>
      <Form family={m.family} second={m.second} label={FAMILY_NAME[m.family]} /><b>{timeLabel(new Date(m.at)).replace(/ (am|pm)/, '')}</b><i>{m.word}</i></button>)}</div>
      : <p className="hint">No feelings yet today. Add one below, or type : in your line.</p>}
    <button type="button" className="btn wide" onClick={() => go({ name: 'feel', when: 'now' })}><Icon name="plus" />Add a feeling</button>
    {ov && <><div className="overall"><span className="ov-form"><Form family={ov.family} label={FAMILY_NAME[ov.family]} /></span><div className="ov-text"><p className="ov-l">The day overall{ov.set ? '' : ', suggested from your moments'}</p><p className="ov-w"><b>{FAMILY_NAME[ov.family]}</b>, like {ladderName(ov.family, ov.strength).toLowerCase()}</p></div></div>
      <div className="btnrow">{ov.set ? <span className="done">Set for today</span> : <button type="button" className="btn primary" onClick={p.onConfirmOverall}>That’s it</button>}<button type="button" className="btn" onClick={p.onChangeOverall}>Change</button></div></>}
    <button type="button" className="btn ghost wide" onClick={() => go({ name: 'day', day: dayKey(p.now) })}>Open today’s page</button></section>;
  const grateful = <section className="panel"><h2 className="lbl">Grateful for</h2><p className="entry">{p.grateful || <span className="hint">One small thing, when you feel like it.</span>}</p></section>;
  const sofar = p.foldedOpen ? <>{grateful}<button type="button" className="btn ghost wide" aria-expanded="true" onClick={p.onToggleFold}><Icon name="up" />Fold away</button></>
    : <button type="button" className="sofar" aria-expanded="false" onClick={p.onToggleFold}><span className="sf-l">Today so far</span><span className="sf-s">grateful for</span><span className="sf-i"><Icon name="down" /></span></button>;
  return <div className="scr"><div className="content scroll">{header}{p.writer}{kept}{weather}{p.night ? sofar : grateful}</div><Tabs current="today" /></div>;
}
export function Today() {
  const now = new Date(), day = dayKey(now), undo = useUndo();
  const [open, setOpen] = useState(false), [card, setCard] = useState<{ word: string; src: FeelingSource } | null>(null), [menu, setMenu] = useState<number | null>(null);
  const remover = useRef<((w: string) => void) | null>(null);
  const data = useLiveQuery(async () => {
    const [entries, moments, all, allMoments] = await Promise.all([db.entries.where('day').equals(day).toArray(), db.moments.where('day').equals(day).toArray(), db.entries.toArray(), db.moments.toArray()]);
    const byDay: Record<string, Family[]> = {}; allMoments.forEach(m => (byDay[m.day] ??= []).push(m.family));
    const tagHistory: Record<string, Family[]> = {}; all.forEach(e => e.tags.forEach(t => (tagHistory[t] ??= []).push(...(byDay[e.day] ?? []))));
    return { entries, moments, tagHistory, row: await db.days.get(day), settings: await getSettings(db), people: await db.people.toArray(), tags: (await db.tags.toArray()).map(t => t.name),
      own: Object.fromEntries((await db.words.toArray()).map(w => [w.word, w.family])) as Record<string, Family> };
  }, [day]);
  const needsFirstRun = !!data && !data.settings.starterLoaded && !localStorage.getItem('logbook-first-run-skipped');
  useEffect(() => { if (needsFirstRun) go({ name: 'first-run' }); }, [needsFirstRun]);
  if (!data || needsFirstRun) return <div className="scr" />;
  const suggested = suggestedOverall(data.moments);
  return <>
    <TodayView now={now} greeting={VOICES[data.settings.voice % VOICES.length].greeting} night={isNight(now)} entries={data.entries} moments={data.moments} overall={data.row?.overall} suggested={suggested} grateful={data.row?.grateful} own={data.own} tagHistory={data.tagHistory}
      foldedOpen={open} onToggleFold={() => setOpen(!open)} onConfirmOverall={async () => { if (suggested) undo.show(await confirmOverall(db, day, suggested), `The day overall is ${FAMILY_NAME[suggested.family].toLowerCase()}.`); }}
      onChangeOverall={() => go({ name: 'feel', when: 'day' })} onOpenFeeling={(word, src) => setCard({ word, src })} onEntryMenu={setMenu}
      writer={<LineWriter own={data.own} people={data.people} tags={data.tags} removerRef={remover} onOpenFeeling={w => setCard({ word: w, src: { kind: 'draft' } })} />} />
    {card && <FeelingCard word={card.word} src={card.src} own={data.own} onClose={() => setCard(null)} onRemoveFromDraft={w => remover.current?.(w)} />}
    {menu != null && <Sheet label="This entry" onClose={() => setMenu(null)}><p className="tdate sm">This entry</p><div className="btnrow col">
      <button type="button" className="btn danger wide" onClick={async () => { const id = menu; setMenu(null); undo.show(await removeEntry(db, id), 'Removed.'); }}>Remove it</button>
      <button type="button" className="btn primary wide" onClick={() => setMenu(null)}>Close</button></div></Sheet>}
  </>;
}
