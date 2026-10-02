import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { getSettings, keepEntry, keepPlace, keepSpan, type EntryDraft, type Undo } from '../../db/actions';
import { addPhotos, keepKeepsake, photosMessage } from '../../db/photos';
import { dayKey, parseDay, timeLabel } from '../../domain/day';
import { roundCoord } from '../../domain/geo';
import { go, type FormKind } from '../../router';
import { useUndo } from '../../ui/Undo';
import { sourcesOf } from '../../db/stamps';
import { fetchJson } from '../../sources/http';
import { overpassQuery, parsePlaces } from '../../sources/overpass';
import type { SuggestState } from './index';
import { useNow } from '../../ui/useNow';
import { KeepFormView, MediaFormView, PastFormView, PersonFormView, PhotoFormView, PlaceFormView, QuoteFormView, SpanFormView,
  type KeepState, type MediaState, type PastState, type PersonState, type PlaceState, type QuoteState, type SpanState } from './index';
import { VoiceForm } from './VoiceForm';
import { chooseFromGooglePhotos, googlePhotosReady } from '../../ui/googlePhotos';

/* Each form's state, its save, and the way back to Today with an Undo notice carried across the move. */
function useForm<T>(start: T) { const [s, set] = useState(start); return [s, (p: Partial<T>) => set(prev => ({ ...prev, ...p }))] as const; }
function useKeeper() {
  const undo = useUndo(), busy = useRef(false);
  return async (save: () => Promise<{ undo: Undo; message: string }>) => {
    if (busy.current) return; busy.current = true;
    try { const r = await save(); undo.show(r.undo, r.message, { carry: true }); go({ name: 'today' }); }
    catch (e) { undo.fail(e); } finally { busy.current = false; }
  };
}
const words = (d: string) => parseDay(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
export function FormScreen({ kind }: { kind: FormKind }) {
  const now = useNow(), keep = useKeeper(), undo = useUndo(), sub = `It lands in today, at ${timeLabel(new Date())}`;
  const data = useLiveQuery(async () => ({ people: await db.people.toArray(), places: await db.places.toArray(), homes: (await getSettings(db)).homes, google: googlePhotosReady(await getSettings(db)) }), []);
  const [media, setMedia] = useForm<MediaState>({ media: 'Film', title: (() => { try { const t = sessionStorage.getItem('logbook-media-title') ?? ''; sessionStorage.removeItem('logbook-media-title'); return t; } catch { return ''; } })(), rating: 5, current: false, note: '' });
  const [quote, setQuote] = useForm<QuoteState>({ text: '', who: 'Overheard', where: '' });
  const [place, setPlace] = useForm<PlaceState>({ name: '', first: false });
  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(null), [locating, setLocating] = useState(false), [placeErr, setPlaceErr] = useState('');
  const [sugg, setSugg] = useState<{ name: string; km: number }[]>([]), [sState, setSState] = useState<SuggestState>('idle');
  const onSuggest = async () => {
    if (!pos) return; if (!sourcesOf(await getSettings(db)).places) { setSState('off'); return; }
    setSState('loading'); const q = overpassQuery(pos.lat, pos.lon);
    try { const list = parsePlaces(await fetchJson(q.url, q.init), pos.lat, pos.lon);
      if (!sourcesOf(await getSettings(db)).places) { setSugg([]); setSState('off'); return; } // switched off while asking: drop the answer
      setSugg(list); setSState(list.length ? 'idle' : 'none'); } catch { setSState('offline'); }
  };
  const [person, setPerson] = useForm<PersonState>({ who: [], how: 'In person' });
  const [keepsake, setKeepsake] = useForm<KeepState & { file?: File }>({ name: '' });
  const [span, setSpan] = useForm<SpanState>({ name: '', from: dayKey(now), to: dayKey(now), family: 'warm' });
  const [spanErr, setSpanErr] = useState('');
  const [past, setPast] = useForm<PastState>({ date: '', text: '' });
  const entry = (d: Omit<EntryDraft, 'at'>, message = 'Kept in today.') => async () => ({ undo: (await keepEntry(db, { ...d, at: new Date() })).undo, message });
  const people = data?.people ?? [];
  switch (kind) {
    case 'media': return <MediaFormView {...media} keepSub={sub} onChange={setMedia} onKeep={() => keep(entry({ kind: 'media', text: media.note, data: { kind: 'media', media: media.media, title: media.title.trim(), rating: media.rating, current: media.current } }))} />;
    case 'quote': return <QuoteFormView {...quote} people={people} keepSub={sub} onChange={setQuote}
      onKeep={() => keep(entry({ kind: 'quote', text: quote.text, people: quote.who.length === 1 ? [quote.who] : [], data: { kind: 'quote', who: quote.who, ...(quote.where.trim() ? { where: quote.where.trim() } : {}) } }))} />;
    case 'place': return <PlaceFormView {...place} pos={pos} canLocate={typeof navigator !== 'undefined' && 'geolocation' in navigator} locating={locating} error={placeErr} suggestions={sugg} suggestState={sState} onSuggest={onSuggest} places={data?.places ?? []} homes={data?.homes ?? []} keepSub={sub} onChange={setPlace}
      onLocate={() => { setLocating(true); setPlaceErr('');
        navigator.geolocation.getCurrentPosition(p => { setPos({ lat: roundCoord(p.coords.latitude), lon: roundCoord(p.coords.longitude) }); setLocating(false); },
          () => { setPlaceErr('Logbook couldn’t get your position. You can still keep the place.'); setLocating(false); }, { maximumAge: 60_000, timeout: 15_000 }); }}
      onKeep={() => keep(async () => ({ undo: (await keepPlace(db, { name: place.name, first: place.first, ...(pos ?? {}), at: new Date() })).undo, message: 'Kept in today.' }))} />;
    case 'person': return <PersonFormView {...person} people={people} keepSub={sub} onChange={setPerson} onKeep={() => keep(entry({ kind: 'person', text: '', data: { kind: 'person', who: person.who, how: person.how } }))} />;
    case 'keep': return <KeepFormView name={keepsake.name} thumb={keepsake.file} keepSub={sub} onChange={setKeepsake} onPick={file => setKeepsake({ file })}
      onKeep={() => keep(async () => ({ undo: (await keepKeepsake(db, { name: keepsake.name, file: keepsake.file, at: new Date() })).undo, message: 'Kept in today.' }))} />;
    case 'span': return <SpanFormView {...span} error={spanErr} keepSub={sub} onChange={p => { setSpan(p); setSpanErr(''); }}
      onKeep={() => { if (span.to < span.from) { setSpanErr('The span ends before it starts.'); return; }
        void keep(async () => ({ undo: (await keepSpan(db, span, new Date())).undo, message: `Kept ${span.name.trim()} on the calendar.` })); }} />;
    case 'past': return <PastFormView {...past} today={dayKey(now)} keepSub={past.date ? `It goes on ${words(past.date)}` : 'Choose the date first'} onChange={setPast}
      onKeep={() => keep(entry({ kind: 'past', text: past.text, data: { kind: 'past' }, day: past.date }, `Kept on ${words(past.date)}, written later.`))} />;
    case 'photo': return <PhotoFormView onGoogle={data?.google ? async () => { try { const r = await chooseFromGooglePhotos(); if ('undo' in r) { undo.show(r.undo, r.message, { carry: true }); go({ name: 'today' }); } else undo.fail(Object.assign(new Error(r.message), { name: 'PlainMessage' })); } catch (e) { undo.fail(e); } } : undefined} onPick={async files => { try { const r = await addPhotos(db, files, new Date());
      if (r.added) { undo.show(r.undo, photosMessage(r.added, r.failed), { carry: true }); go({ name: 'today' }); } else undo.fail(Object.assign(new Error(photosMessage(0, r.failed)), { name: 'NotAnImageError' })); } catch (e) { undo.fail(e); } }} />;
    case 'voice': return <VoiceForm />;
  }
}
