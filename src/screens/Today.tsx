import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { confirmOverall, getSettings } from '../db/actions';
import type { DayRow, Entry, Moment } from '../db/types';
import { dayKey, isNight, parseDay, timeLabel } from '../domain/day';
import { useNow } from '../ui/useNow';
import { FAMILY_NAME, ladderName, type Family } from '../vocab/vocab';
import { Form } from '../ui/Form';
import { Icon } from '../ui/Icons';
import { Tabs } from '../ui/Tabs';
import { Sheet } from '../ui/Sheet';
import { useUndo } from '../ui/Undo';
import { go } from '../router';
import { VOICES } from '../domain/voices';
import { LineWriter } from './LineWriter';
import { FeelingCard, type FeelingSource } from './FeelingCard';
import { KeptCard } from './KeptCard';
import { PostcardView } from './Postcard';
import { driveDue } from '../sources/drive';
import { runSync, syncDue, syncMessage } from '../ui/syncNow';
import { chooseFromGooglePhotos, googlePhotosReady } from '../ui/googlePhotos';
import { syncPostcards, type Postcard } from '../sources/shelf';
import { MediaMove } from './MediaMove';
import { addDays } from '../domain/day';
import { OutsideLine, StampsPanelView, type StampsProps } from './Stamps';
import { useStamps } from '../ui/useStamps';
import { addWhereToday } from '../db/stamps';
import { roundCoord } from '../domain/geo';
import { EntryMenu } from './EntryMenu';
import { BlobImg } from '../ui/Blob';
import { addPhotos, photosMessage, removePhoto } from '../db/photos';
import { setPhotoOfDay } from '../db/actions';
import { EMPTY_LOOKUP, type Lookup } from '../domain/entryText';
import { loadLookup } from '../db/lookup';

export { Form } from '../ui/Form';
import { maskMoments, PRIVATE_FEELING, suggestedOverall, visibleTags } from '../domain/looking';
import { onThisDay } from '../domain/almanac';
import { EMPTY_LOOKUP as NO_LOOKUP, entryLine as lineOf } from '../domain/entryText';
import { usePrivacy } from '../ui/Privacy';
export { suggestedOverall };
export { RichText } from './KeptCard';
export type TodayProps = { now: Date; greeting: string; night: boolean; entries: Entry[]; moments: Moment[]; overall?: DayRow['overall']; suggested?: { word: string; family: Family; strength: number }; grateful?: string; foldedOpen: boolean;
  own?: Record<string, Family>; tagHistory?: Record<string, Family[]>; lookup?: Lookup; thumbs?: Map<number, Blob>;
  stamps?: StampsProps; onUnlock?(): void; onThisDay?: { year: number; text: string }; postcard?: Postcard; driveDue?: boolean; syncDue?: boolean; onSync?(): void; onGooglePhotos?(): void;
  photos?: { id: number; thumb: Blob }[]; potd?: number; onPickPhotos?(files: File[]): void; onPotd?(id: number): void; onPhotoMenu?(id: number): void;
  onToggleFold(): void; onConfirmOverall(): void; onChangeOverall(): void; onOpenFeeling(word: string, src: FeelingSource): void; onEntryMenu(id: number): void; writer: ReactNode };
/* Today. At night (12 to 5 am) it holds only the line, inner weather and the day overall; the rest folds into one row. */
export function TodayView(p: TodayProps) {
  const own = p.own ?? {}, ov = p.overall ?? (p.suggested ? { ...p.suggested, set: false } : undefined), todayFamily = p.suggested?.family ?? 'calm';
  const header = <header className="thead onwall"><div className="hrow"><div className="hdate"><h1 className="tdate">{parseDay(dayKey(p.now)).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</h1>{p.stamps && <OutsideLine list={p.stamps.list} />}</div>
    <div className="hbtns"><button type="button" className="iconbtn" aria-label="Search" onClick={() => go({ name: 'search' })}><Icon name="search" /></button><button type="button" className="iconbtn" aria-label="Settings" onClick={() => go({ name: 'settings' })}><Icon name="sliders" /></button></div></div><p className="voice">{p.greeting}</p></header>;
  const kept = p.entries.length ? <section className="panel"><h2 className="lbl">Kept today</h2>{[...p.entries].sort((a, b) => b.at - a.at).map(e => <KeptCard key={e.id} entry={e} lookup={p.lookup ?? EMPTY_LOOKUP} own={own} thumbs={p.thumbs} tagHistory={p.tagHistory} todayFamily={todayFamily}
    onOpenFeeling={w => p.onOpenFeeling(w, { kind: 'entry', id: e.id! })} onOpenTag={tag => go({ name: 'tag', tag })} onOpenPerson={i => go({ name: 'person', id: p.lookup?.people.get(i)?.id ?? i.toLowerCase() })} onMenu={p.onEntryMenu} />)}</section> : null;
  const weather = <section className="panel" aria-labelledby="h-weather"><h2 className="lbl" id="h-weather">Inner weather</h2>
    {p.moments.length ? <div className="moms" role="list">{[...p.moments].sort((a, b) => a.at - b.at).map(m => <button key={m.id} type="button" className="mom" onClick={() => (m.word === PRIVATE_FEELING ? p.onUnlock?.() : p.onOpenFeeling(m.word, { kind: 'moment', id: m.id! }))} aria-label={`${timeLabel(new Date(m.at))}, ${m.word}. Open its card`}>
      <Form family={m.family} second={m.second} label={FAMILY_NAME[m.family]} /><b>{timeLabel(new Date(m.at)).replace(/ (am|pm)/, '')}</b><i>{m.word}</i></button>)}</div>
      : <p className="hint">No feelings yet today. Add one below, or type : in your line.</p>}
    <button type="button" className="btn wide" onClick={() => go({ name: 'feel', when: 'now' })}><Icon name="plus" />Add a feeling</button>
    {ov && <><div className="overall"><span className="ov-form"><Form family={ov.family} label={FAMILY_NAME[ov.family]} /></span><div className="ov-text"><p className="ov-l">The day overall{ov.set ? '' : ', suggested from your moments'}</p><p className="ov-w"><b>{FAMILY_NAME[ov.family]}</b>, like {ladderName(ov.family, ov.strength).toLowerCase()}</p></div></div>
      <div className="btnrow">{ov.set ? <span className="done">Set for today</span> : <button type="button" className="btn primary" onClick={p.onConfirmOverall}>That’s it</button>}<button type="button" className="btn" onClick={p.onChangeOverall}>Change</button></div></>}
    <button type="button" className="btn ghost wide" onClick={() => go({ name: 'day', day: dayKey(p.now) })}>Open today’s page</button></section>;
  const photos = p.photos ?? [], pick = useRef<HTMLInputElement>(null);
  const photoPanel = <section className="panel"><h2 className="lbl">Today’s photos</h2>
    {photos.length ? <><div className="phrow">{photos.map((ph, i) => { const on = ph.id === p.potd; return <button key={ph.id} type="button" className={'ph' + (on ? ' potd' : '')} aria-pressed={on}
      aria-label={`Photo ${i + 1}${on ? ', the photo of the day. Tap for more' : '. Make it the photo of the day'}`} onClick={() => (on ? p.onPhotoMenu?.(ph.id) : p.onPotd?.(ph.id))} onContextMenu={e => { e.preventDefault(); p.onPhotoMenu?.(ph.id); }}>
      <BlobImg blob={ph.thumb} alt="" className="phimg" />{on && <b><Icon name="first" /></b>}</button>; })}</div>
      <p className="hint">Tap a photo to make it the photo of the day. Press and hold one to remove it. Photos stay on your phone.</p></>
      : <p className="hint">None yet. Photos stay on your phone.</p>}
    <button type="button" className="btn wide" onClick={() => pick.current?.click()}><Icon name="photo" />Add from your phone</button>
    {p.onGooglePhotos && <button type="button" className="btn ghost wide" onClick={p.onGooglePhotos}>Choose from Google Photos</button>}
    <input ref={pick} type="file" accept="image/*" multiple hidden onChange={e => { const fs = [...(e.target.files ?? [])]; e.target.value = ''; if (fs.length) p.onPickPhotos?.(fs); }} /></section>;
  const grateful = <section className="panel"><h2 className="lbl">Grateful for</h2><p className="entry">{p.grateful || <span className="hint">One small thing, when you feel like it.</span>}</p></section>;
  const stampPanel = p.stamps ? <StampsPanelView {...p.stamps} /> : null;
  const sync = p.syncDue && p.onSync ? <section className="panel"><p className="entry">This device hasn’t synced with your others for a day.</p><button type="button" className="btn wide" onClick={p.onSync}>Sync now</button></section> : null;
  const drive = p.driveDue ? <section className="panel"><p className="entry">This month’s Drive backup hasn’t been made yet.</p><button type="button" className="btn wide" onClick={() => go({ name: 'settings' })}>Back it up from Settings</button></section> : null;
  const card = p.postcard ? <PostcardView card={p.postcard} night={p.now.getHours() >= 23 || p.night} /> : null;
  const onThis = p.onThisDay ? <section className="panel"><h2 className="lbl">On this day, {p.onThisDay.year}</h2><p className="entry">{p.onThisDay.text}</p>
    <button type="button" className="btn ghost" onClick={() => go({ name: 'almanac', tab: 'random' })}>Then and now</button></section> : null;
  const sofar = p.foldedOpen ? <>{photoPanel}{card}{stampPanel}{onThis}{grateful}<button type="button" className="btn ghost wide" aria-expanded="true" onClick={p.onToggleFold}><Icon name="up" />Fold away</button></>
    : <button type="button" className="sofar" aria-expanded="false" onClick={p.onToggleFold}><span className="sf-l">Today so far</span><span className="sf-s">{photos.length ? `${photos.length} photo${photos.length === 1 ? '' : 's'} · ` : ''}{p.postcard ? 'yesterday from Health · ' : ''}grateful for{p.stamps ? ' · stamps' : ''}{p.onThisDay ? ' · on this day' : ''}</span><span className="sf-i"><Icon name="down" /></span></button>;
  return <div className="scr"><div className="content scroll">{header}{p.writer}{kept}{p.night ? null : photoPanel}{weather}{p.night ? null : card}{p.night ? null : stampPanel}{p.night ? null : onThis}{p.night ? sofar : grateful}{p.night ? null : sync}{p.night ? null : drive}</div><Tabs current="today" /></div>;
}
const skippedFirstRun = () => { try { return !!localStorage.getItem('logbook-first-run-skipped'); } catch { return false; } };
export function Today() {
  useEffect(() => { const sync = () => { if (!document.hidden) void syncPostcards(db); }; sync(); document.addEventListener('visibilitychange', sync); return () => document.removeEventListener('visibilitychange', sync); }, []);
  const now = useNow(), day = dayKey(now), undo = useUndo(), privacy = usePrivacy(), st = useStamps(day), [stampsOpen, setStampsOpen] = useState(false);
  const [open, setOpen] = useState(false), [card, setCard] = useState<{ word: string; src: FeelingSource } | null>(null), [menu, setMenu] = useState<number | null>(null), [photoMenu, setPhotoMenu] = useState<number | null>(null);
  const remover = useRef<((w: string) => void) | null>(null);
  const data = useLiveQuery(async () => {
    const [entries, moments, all, allMoments] = await Promise.all([db.entries.where('day').equals(day).toArray(), db.moments.where('day').equals(day).toArray(), db.entries.toArray(), db.moments.toArray()]);
    const byDay: Record<string, Family[]> = {}; allMoments.forEach(m => (byDay[m.day] ??= []).push(m.family));
    const tagHistory: Record<string, Family[]> = {}; all.forEach(e => e.tags.forEach(t => (tagHistory[t] ??= []).push(...(byDay[e.day] ?? []))));
    const pc = await db.postcards.get(`health:${addDays(day, -1)}`);
    return { postcard: pc?.data as Postcard | undefined, entries, all, moments, tagHistory, onThis: onThisDay(all.filter(e => !(privacy.locked && e.marks.priv)), day)[0], row: await db.days.get(day), settings: await getSettings(db), people: await db.people.toArray(), tags: (await db.tags.toArray()).map(t => t.name),
      own: Object.fromEntries((await db.words.toArray()).map(w => [w.word, w.family])) as Record<string, Family>, lookup: await loadLookup(db),
      photos: (await db.photos.where('day').equals(day).toArray()).sort((a, b) => a.addedAt - b.addedAt).map(ph => ({ id: ph.id!, thumb: ph.thumb })) };
  }, [day, privacy.locked]);
  const needsFirstRun = !!data && !data.settings.starterLoaded && !skippedFirstRun();
  useEffect(() => { if (needsFirstRun) go({ name: 'first-run' }); }, [needsFirstRun]);
  if (!data || needsFirstRun) return <div className="scr" />;
  const suggested = suggestedOverall(data.moments);
  return <>
    <TodayView now={now} greeting={VOICES[data.settings.voice % VOICES.length].greeting} night={isNight(now)} entries={data.entries} moments={maskMoments(data.moments, data.entries, privacy.locked)} onUnlock={() => void privacy.unlock()} postcard={data.postcard} driveDue={driveDue(data.settings)} syncDue={syncDue(data.settings, now)} onSync={async () => { try { const r = await runSync(true, { locked: privacy.locked, unlock: privacy.unlock }); if (r) undo.note(syncMessage(r)); } catch (e) { undo.fail(e); } }} onGooglePhotos={googlePhotosReady(data.settings) ? async () => { try { const r = await chooseFromGooglePhotos(); if ('undo' in r) undo.show(r.undo, r.message); else undo.fail(Object.assign(new Error(r.message), { name: 'PlainMessage' })); } catch (e) { undo.fail(e); } } : undefined} onThisDay={data.onThis ? { year: data.onThis.year, text: lineOf(data.onThis.entry, data.lookup ?? NO_LOOKUP) } : undefined} overall={data.row?.overall} suggested={suggested} grateful={data.row?.grateful} own={data.own} tagHistory={data.tagHistory} lookup={data.lookup}
      stamps={{ list: st.list, status: st.status, open: stampsOpen, onToggle: () => setStampsOpen(!stampsOpen), canLocate: typeof navigator !== 'undefined' && 'geolocation' in navigator, placeSource: st.pos?.source,
        onWhere: () => navigator.geolocation.getCurrentPosition(async p => { try { undo.show(await addWhereToday(db, day, { lat: roundCoord(p.coords.latitude), lon: roundCoord(p.coords.longitude) }), 'Added where you are today.'); st.refresh(); } catch (e) { undo.fail(e); } },
          () => undo.fail(Object.assign(new Error(data.settings.homes.length ? 'Logbook couldn’t get your position. Weather uses your home instead.' : 'Logbook couldn’t get your position.'), { name: 'PlainMessage' })), { maximumAge: 60_000, timeout: 15_000 }) }}
      thumbs={new Map(data.photos.map(ph => [ph.id, ph.thumb]))} photos={data.photos} potd={data.row?.potd}
      onPickPhotos={async files => { try { const r = await addPhotos(db, files, new Date());
        if (r.added) undo.show(r.undo, photosMessage(r.added, r.failed)); else undo.fail(Object.assign(new Error(photosMessage(0, r.failed)), { name: 'NotAnImageError' })); } catch (e) { undo.fail(e); } }}
      onPotd={async id => { try { undo.show(await setPhotoOfDay(db, day, id), 'That’s the photo of the day now.'); } catch (e) { undo.fail(e); } }} onPhotoMenu={setPhotoMenu}
      foldedOpen={open} onToggleFold={() => setOpen(!open)} onConfirmOverall={async () => { if (suggested) try { undo.show(await confirmOverall(db, day, suggested), `The day overall is ${FAMILY_NAME[suggested.family].toLowerCase()}.`); } catch (e) { undo.fail(e); } }}
      onChangeOverall={() => go({ name: 'feel', when: 'day' })} onOpenFeeling={(word, src) => setCard({ word, src })} onEntryMenu={setMenu}
      writer={<><MediaMove /><LineWriter own={data.own} people={data.people} tags={visibleTags(data.tags, data.all, privacy.locked)} removerRef={remover} onOpenFeeling={w => setCard({ word: w, src: { kind: 'draft' } })} /></>} />
    {card && <FeelingCard word={card.word} src={card.src} own={data.own} onClose={() => setCard(null)} onRemoveFromDraft={w => remover.current?.(w)} />}
    {menu != null && <EntryMenu id={menu} onClose={() => setMenu(null)} />}
    {photoMenu != null && <Sheet label="This photo" onClose={() => setPhotoMenu(null)}><p className="tdate sm">This photo</p><div className="btnrow col">
      <button type="button" className="btn danger wide" onClick={async () => { const id = photoMenu; setPhotoMenu(null); try { undo.show(await removePhoto(db, id), 'Removed the photo.'); } catch (e) { undo.fail(e); } }}>Remove this photo</button>
      <button type="button" className="btn primary wide" onClick={() => setPhotoMenu(null)}>Close</button></div></Sheet>}
  </>;
}
