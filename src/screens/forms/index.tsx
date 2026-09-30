import type { ReactNode } from 'react';
import { useRef } from 'react';
import type { How, MediaKind, Person, Place } from '../../db/types';
import { PERSON_THREADS } from '../../domain/colour';
import { RATINGS, ratingText } from '../../domain/rating';
import { FAMILIES, FAMILY_NAME, type Family } from '../../vocab/vocab';
import { drawPlaceMap } from '../../draw/placeMap';
import { Scene } from '../../draw/Canvas';
import { Icon } from '../../ui/Icons';
import { useLook } from '../../ui/Look';
import { BlobImg } from '../../ui/Blob';

type Change<T> = { onChange(patch: Partial<T>): void; onKeep(): void };
/* The frame every form shares: a way back, its name, the fields, and a Keep button pinned within thumb reach that says what it keeps. */
export function FormFrame({ title, children, keepLabel, keepSub, disabled, onKeep }: { title: string; children: ReactNode; keepLabel?: string; keepSub?: string; disabled?: boolean; onKeep?(): void }) {
  return <div className="scr"><div className="content scroll">
    <header className="thead row2"><button type="button" className="back" aria-label="Back" onClick={() => history.back()}><Icon name="back" /></button><h1 className="tdate sm">{title}</h1></header>
    <section className="panel formpanel">{children}</section></div>
    {keepLabel && <div className="pinbar"><button type="button" className="btn primary big" disabled={disabled} onClick={onKeep}><span>{keepLabel}</span>{keepSub && <small>{keepSub}</small>}</button></div>}</div>;
}
const Chips = <T extends string,>({ label, options, value, on, names }: { label: string; options: readonly T[]; value: T | T[]; on(v: T): void; names?: (v: T) => string }) =>
  <div className="chips" role="group" aria-label={label}>{options.map(o => { const sel = Array.isArray(value) ? value.includes(o) : value === o; return <button key={o} type="button" className={'chip' + (sel ? ' on ink' : '')} aria-pressed={sel} onClick={() => on(o)}>{names ? names(o) : o}</button>; })}</div>;
const Field = ({ label, children }: { label: string; children: ReactNode }) => <label className="field"><span>{label}</span>{children}</label>;
const lower = (m: MediaKind) => (m === 'Other' ? 'one' : m.toLowerCase());

export const MEDIA_KINDS: MediaKind[] = ['Film', 'Series', 'Book', 'Game', 'Album', 'Other'];
export type MediaState = { media: MediaKind; title: string; rating: number; current: boolean; note: string };
/* A film, book or show on the owner's 1-7 scale. The buttons are neutral: a rating is never a feeling colour. */
export function MediaFormView(p: MediaState & Change<MediaState> & { keepSub?: string }) {
  return <FormFrame title="Film, book or show" keepLabel={`Keep this ${lower(p.media)}`} keepSub={p.keepSub} disabled={!p.title.trim()} onKeep={p.onKeep}>
    <Chips label="Kind" options={MEDIA_KINDS} value={p.media} on={media => p.onChange({ media })} />
    <Field label="Title"><input className="sinput" value={p.title} onChange={e => p.onChange({ title: e.target.value })} /></Field>
    <h2 className="lbl">Your rating</h2>
    <div className="sewrow" role="group" aria-label="Rating, 1 to 7">{RATINGS.map(([n, words]) => <button key={n} type="button" className={'sewbtn' + (p.rating === n ? ' on' : '')} aria-pressed={p.rating === n} aria-label={`${n}, ${words}`} onClick={() => p.onChange({ rating: n })}>{n}</button>)}</div>
    <p className="sewlab">{ratingText(p.rating)}{p.rating === 4 ? ' (the true middle)' : ''}</p>
    <Field label="One line about it (optional)"><input className="sinput" value={p.note} onChange={e => p.onChange({ note: e.target.value })} /></Field>
    <label className="toggle"><input type="checkbox" checked={p.current} onChange={e => p.onChange({ current: e.target.checked })} /><span>Pin to Currently (still watching, reading or playing)</span></label>
  </FormFrame>;
}
export type QuoteState = { text: string; who: string; where: string };
export function QuoteFormView(p: QuoteState & Change<QuoteState> & { people: Person[]; keepSub?: string }) {
  const whos = [...p.people.map(x => x.initial), 'Overheard', 'A book or film'];
  return <FormFrame title="Quote" keepLabel="Keep this quote" keepSub={p.keepSub} disabled={!p.text.trim()} onKeep={p.onKeep}>
    <Field label="What was said"><textarea className="note" value={p.text} onChange={e => p.onChange({ text: e.target.value })} /></Field>
    <h2 className="lbl">Who said it</h2>
    <Chips label="Who said it" options={whos} value={p.who} on={who => p.onChange({ who })} names={w => p.people.find(x => x.initial === w)?.name ?? w} />
    <Field label="Where (optional)"><input className="sinput" value={p.where} onChange={e => p.onChange({ where: e.target.value })} /></Field>
  </FormFrame>;
}
export type PlaceState = { name: string; first: boolean };
/* A place: its name is typed (suggestions from OpenStreetMap come later, and only when asked). Its position is read once, only on "Use where I am". */
export function PlaceFormView(p: PlaceState & Change<PlaceState> & { pos: { lat: number; lon: number } | null; canLocate: boolean; locating?: boolean; error: string; places: Place[]; homes: { lat: number; lon: number }[]; onLocate(): void; keepSub?: string }) {
  const look = useLook(), preview: Place[] = [...p.places, ...(p.pos ? [{ name: p.name, first: p.first, visits: 1, ...p.pos }] : [])];
  return <FormFrame title="Place" keepLabel="Keep this place" keepSub={p.keepSub} disabled={!p.name.trim()} onKeep={p.onKeep}>
    <Field label="Place name"><input className="sinput" value={p.name} onChange={e => p.onChange({ name: e.target.value })} /></Field>
    <label className="toggle"><input type="checkbox" checked={p.first} onChange={e => p.onChange({ first: e.target.checked })} /><span>This is a first</span></label>
    {p.canLocate && <button type="button" className="btn wide" disabled={p.locating} onClick={p.onLocate}><Icon name="k-place" />{p.pos ? 'Position added. Use where I am again' : p.locating ? 'Finding where you are…' : 'Use where I am'}</button>}
    {p.error && <p className="hint" role="alert">{p.error}</p>}
    <p className="hint">{p.pos ? 'Kept to about 100 metres. Logbook reads your position only when you tap the button.' : 'It shows on your map once it has a position. Without one, it is still kept in your places.'}</p>
    <Scene className="mapmini" label={p.pos ? 'A small drawn map with this place among your others' : 'A small drawn map of your places'} animate draw={(ctx, w, h, t) => drawPlaceMap(ctx, look, w, h, t, preview, p.homes)} />
  </FormFrame>;
}
export type PersonState = { who: string[]; how: How };
export function PersonFormView(p: PersonState & Change<PersonState> & { people: Person[]; keepSub?: string }) {
  return <FormFrame title="Person" keepLabel={`Keep this ${p.how === 'In person' ? 'time together' : p.how === 'Call' ? 'call' : 'chat'}`} keepSub={p.keepSub} disabled={!p.who.length} onKeep={p.onKeep}>
    <h2 className="lbl">Who</h2>
    {p.people.length ? <div className="faces pick">{p.people.map(x => { const on = p.who.includes(x.initial); return <button key={x.id} type="button" className={'face' + (on ? ' seen' : '')} style={{ ['--pc' as string]: PERSON_THREADS[x.thread % PERSON_THREADS.length] }} aria-pressed={on} aria-label={x.name}
      onClick={() => p.onChange({ who: on ? p.who.filter(w => w !== x.initial) : [...p.who, x.initial] })}>{x.initial}</button>; })}</div>
      : <p className="hint">No people yet. They come from your private starter file, in Settings.</p>}
    <h2 className="lbl">How</h2>
    <Chips label="How" options={['In person', 'Call', 'Messages'] as How[]} value={p.how} on={how => p.onChange({ how })} />
    <p className="hint">Calls and messages count as time together.</p>
  </FormFrame>;
}
export type KeepState = { name: string };
export function KeepFormView(p: KeepState & Change<KeepState> & { thumb?: Blob; onPick(f: File): void; keepSub?: string }) {
  const pick = useRef<HTMLInputElement>(null);
  return <FormFrame title="Keepsake" keepLabel="Keep this keepsake" keepSub={p.keepSub} disabled={!p.name.trim()} onKeep={p.onKeep}>
    <button type="button" className="keepslot" onClick={() => pick.current?.click()}>{p.thumb ? <BlobImg blob={p.thumb} alt="The photo of it" className="photo" /> : <span><Icon name="photo" />Add a photo of it</span>}</button>
    <input ref={pick} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) p.onPick(f); }} />
    <Field label="What is it?"><input className="sinput" value={p.name} onChange={e => p.onChange({ name: e.target.value })} /></Field>
  </FormFrame>;
}
export type SpanState = { name: string; from: string; to: string; family: Family };
/* A trip or a stretch of days. Its colour always comes with its family's name, and its dates in words on the calendar. */
export function SpanFormView(p: SpanState & Change<SpanState> & { error: string; keepSub?: string }) {
  const { pal } = useLook();
  return <FormFrame title="Span" keepLabel="Keep this span" keepSub={p.keepSub} disabled={!p.name.trim() || !p.from || !p.to} onKeep={p.onKeep}>
    <Field label="Name"><input className="sinput" value={p.name} onChange={e => p.onChange({ name: e.target.value })} /></Field>
    <div className="daterow"><Field label="From"><input className="sinput" type="date" value={p.from} onChange={e => p.onChange({ from: e.target.value })} /></Field>
      <Field label="To"><input className="sinput" type="date" value={p.to} min={p.from || undefined} onChange={e => p.onChange({ to: e.target.value })} /></Field></div>
    {p.error && <p className="hint" role="alert">{p.error}</p>}
    <h2 className="lbl">Its colour</h2>
    <div className="swatches" role="group" aria-label="Span colour">{FAMILIES.map(f => <button key={f} type="button" className={'swatch' + (p.family === f ? ' on' : '')} aria-pressed={p.family === f} style={{ ['--fc' as string]: pal[f] }} onClick={() => p.onChange({ family: f })}><i />{FAMILY_NAME[f]}</button>)}</div>
    <p className="hint">It shows as a band along those days in the calendar, with its name listed underneath.</p>
  </FormFrame>;
}
export function validPastDate(d: string, today: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return 'Choose a date.';
  if (d > today) return 'That date is in the future. Something from before needs a past date.';
  return null;
}
export type PastState = { date: string; text: string };
export function PastFormView(p: PastState & Change<PastState> & { today: string; keepSub?: string }) {
  const err = p.date ? validPastDate(p.date, p.today) : null;
  return <FormFrame title="Something from before" keepLabel="Keep this moment" keepSub={p.keepSub} disabled={!!validPastDate(p.date, p.today) || !p.text.trim()} onKeep={p.onKeep}>
    <Field label="When"><input className="sinput" type="date" value={p.date} max={p.today} onChange={e => p.onChange({ date: e.target.value })} /></Field>
    {err && <p className="hint" role="alert">{err}</p>}
    <Field label="What happened"><textarea className="note" value={p.text} onChange={e => p.onChange({ text: e.target.value })} /></Field>
    <p className="hint">It goes on that date with a “written later” stamp. Logbook can fill in that day’s weather later.</p>
  </FormFrame>;
}
export function PhotoFormView({ onPick }: { onPick(files: File[]): void }) {
  const pick = useRef<HTMLInputElement>(null);
  return <FormFrame title="Photo">
    <button type="button" className="keepslot" onClick={() => pick.current?.click()}><span><Icon name="photo" />Choose from your phone</span></button>
    <input ref={pick} type="file" accept="image/*" multiple hidden onChange={e => { const fs = [...(e.target.files ?? [])]; e.target.value = ''; if (fs.length) onPick(fs); }} />
    <p className="hint">Photos are made smaller on your phone and stay there. The first photo of a day becomes its photo of the day.</p>
  </FormFrame>;
}
