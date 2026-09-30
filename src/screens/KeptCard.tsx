import type { ReactNode } from 'react';
import type { Entry } from '../db/types';
import { parseDay, timeLabelIn } from '../domain/day';
import { tokenize } from '../domain/line';
import { tagFamily, PERSON_THREADS } from '../domain/colour';
import { ratingText } from '../domain/rating';
import { DOING, HOW_VERB, QUOTE_WHO, dateRange, minSec, personName, type Lookup } from '../domain/entryText';
import { FAMILY_NAME, feelingOf, type Family } from '../vocab/vocab';
import { FeelingChip, TagChip } from '../ui/Chips';
import { Icon } from '../ui/Icons';
import { useLook } from '../ui/Look';
import { BlobAudio, BlobImg } from '../ui/Blob';

type Opens = { onOpenFeeling: (w: string) => void; onOpenTag?: (tag: string) => void; onOpenPerson?: (initial: string) => void };
/* A person by initial, ringed in their own thread colour (never a feeling colour). A button when it can open their page. */
export function Mention({ initial, lookup, onOpen }: { initial: string; lookup?: Lookup; onOpen?: (i: string) => void }) {
  const p = lookup?.people.get(initial), style = { ['--pc' as string]: PERSON_THREADS[(p?.thread ?? 0) % PERSON_THREADS.length] };
  const label = p ? `${p.name}. Open their page` : undefined;
  return onOpen ? <button type="button" className="mention" style={style} aria-label={label} onClick={() => onOpen(initial)}><b aria-hidden="true">@</b>{initial}</button>
    : <span className="mention" style={style}><b aria-hidden="true">@</b>{initial}</span>;
}
/* A kept line, with tags, people and feelings as chips. Unknown :words stay plain text. */
export function RichText({ text, own, onOpenFeeling, onOpenTag, onOpenPerson, lookup, tagHistory = {}, todayFamily = 'calm' }: Opens & { text: string; own: Record<string, Family>; lookup?: Lookup; tagHistory?: Record<string, Family[]>; todayFamily?: Family }) {
  const parts: ReactNode[] = []; let i = 0;
  tokenize(text).forEach((t, k) => {
    parts.push(text.slice(i, t.start));
    if (t.kind === 'tag') parts.push(<TagChip key={k} tag={t.value} family={tagFamily(t.value, tagHistory, todayFamily)} onOpen={onOpenTag && (() => onOpenTag(t.value))} />);
    else if (t.kind === 'person') parts.push(<Mention key={k} initial={t.value} lookup={lookup} onOpen={onOpenPerson} />);
    else { const x = feelingOf(t.value, own); parts.push(x ? <FeelingChip key={k} word={x.w} family={x.family} onOpen={() => onOpenFeeling(x.w)} /> : t.raw); }
    i = t.end;
  });
  parts.push(text.slice(i));
  return <p className="entry">{parts}</p>;
}
export const MARK_LABEL = { first: 'First', gift: 'Gift', priv: 'Private', quiet: 'Don’t bring back' } as const;
const MARK_ICON = { first: 'first', gift: 'gift', priv: 'lock', quiet: 'quiet' } as const;
const longDate = (d: string) => parseDay(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
export type KeptCardProps = Opens & { entry: Entry; lookup: Lookup; own: Record<string, Family>; onMenu?: (id: number) => void; thumbs?: Map<number, Blob>; tagHistory?: Record<string, Family[]>; todayFamily?: Family };
/* One kept entry of any kind: its body, then its time and marks, and a ⋯ button to change or remove it. */
export function KeptCard(p: KeptCardProps) {
  const e = p.entry, d = e.data, look = useLook();
  const rich = (t: string) => <RichText text={t} own={p.own} lookup={p.lookup} tagHistory={p.tagHistory} todayFamily={p.todayFamily} onOpenFeeling={p.onOpenFeeling} onOpenTag={p.onOpenTag} onOpenPerson={p.onOpenPerson} />;
  let body: ReactNode;
  if (!d) body = rich(e.text);
  else switch (d.kind) {
    case 'media': body = <><p className="entry"><b>{d.media}:</b> {d.title}</p><p className="entry"><span className="rating">{ratingText(d.rating)}</span>{d.current && <> <span className="rating">Currently {DOING[d.media]}</span></>}</p>{e.text && rich(e.text)}</>; break;
    case 'quote': body = <blockquote className="qcard">“{e.text}”<small>{QUOTE_WHO(p.lookup, d.who).replace(/^./, c => c.toUpperCase())}{d.where ? `, ${d.where}` : ''}</small></blockquote>; break;
    case 'place': { const pl = p.lookup.places.get(d.placeId); body = <><p className="entry"><b>Place:</b> {pl?.name ?? 'a place that was removed'}</p>{e.text && rich(e.text)}</>; break; }
    case 'person': body = <><p className="entry"><b>{HOW_VERB[d.how]}:</b> {d.who.map((i, k) => <span key={i}>{k > 0 && ' '}<Mention initial={i} lookup={p.lookup} onOpen={p.onOpenPerson} /><span className="sr-only">{personName(p.lookup, i)}</span></span>)}</p>{e.text && rich(e.text)}</>; break;
    case 'keep': body = <div className="keeprow">{d.photoId != null && p.thumbs?.get(d.photoId) ? <BlobImg blob={p.thumbs.get(d.photoId)} alt="" className="photo" /> : <span className="photo" aria-hidden="true" />}<p className="entry"><b>Keepsake:</b> {e.text}</p></div>; break;
    case 'voice': body = <><p className="entry"><b>Voice note</b> · {minSec(d.seconds)}</p><BlobAudio blob={d.audio} label={`Voice note, ${minSec(d.seconds)}`} />{e.text && rich(e.text)}</>; break;
    case 'span': { const s = p.lookup.spans.get(d.spanId); body = s ? <><p className="entry"><b>Span:</b> {s.name}</p><p className="entry spanline"><i style={{ background: look.pal[s.family] }} aria-hidden="true" />{dateRange(s.from, s.to)} · {FAMILY_NAME[s.family]}</p></> : <p className="entry"><b>Span:</b> a span that was removed</p>; break; }
    case 'past': body = <>{rich(e.text)}<p className="hint">Written later, on {longDate(new Date(e.writtenAt).toISOString().slice(0, 10))}</p></>; break;
  }
  const marks = (Object.keys(MARK_LABEL) as (keyof typeof MARK_LABEL)[]).filter(k => e.marks[k] || (k === 'first' && (d?.kind === 'place' && d.first)));
  return <div className="ent"><div className="ent-top"><div className="ent-body">{body}</div>
    {p.onMenu && <button type="button" className="iconbtn sm" aria-label="Change or remove this entry" onClick={() => p.onMenu!(e.id!)}><Icon name="more" /></button>}</div>
    <div className="ent-meta"><span>{timeLabelIn(e.at, e.tz)}</span>{marks.map(k => <span key={k} className="mpill"><Icon name={MARK_ICON[k]} />{MARK_LABEL[k]}</span>)}</div></div>;
}
