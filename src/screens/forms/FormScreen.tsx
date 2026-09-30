import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { addPlace, addSpan, getSettings, keepEntry, type EntryDraft, type Undo } from '../../db/actions';
import { addPhoto } from '../../db/photos';
import { dayKey, parseDay, timeLabel } from '../../domain/day';
import { roundCoord } from '../../domain/geo';
import { go, type FormKind } from '../../router';
import { useUndo } from '../../ui/Undo';
import { useNow } from '../../ui/useNow';
import { KeepFormView, MediaFormView, PastFormView, PersonFormView, PhotoFormView, PlaceFormView, QuoteFormView, SpanFormView,
  type KeepState, type MediaState, type PastState, type PersonState, type PlaceState, type QuoteState, type SpanState } from './index';
import { VoiceForm } from './VoiceForm';

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
  const data = useLiveQuery(async () => ({ people: await db.people.toArray(), places: await db.places.toArray(), homes: (await getSettings(db)).homes }), []);
  const [media, setMedia] = useForm<MediaState>({ media: 'Film', title: '', rating: 5, current: false, note: '' });
  const [quote, setQuote] = useForm<QuoteState>({ text: '', who: 'Overheard', where: '' });
  const [place, setPlace] = useForm<PlaceState>({ name: '', first: false });
  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(null), [locating, setLocating] = useState(false), [placeErr, setPlaceErr] = useState('');
  const [person, setPerson] = useForm<PersonState>({ who: [], how: 'In person' });
  const [keepsake, setKeepsake] = useForm<KeepState & { photoId?: number; thumb?: Blob }>({ name: '' });
  const [span, setSpan] = useForm<SpanState>({ name: '', from: dayKey(now), to: dayKey(now), family: 'warm' });
  const [spanErr, setSpanErr] = useState('');
  const [past, setPast] = useForm<PastState>({ date: '', text: '' });
  const entry = (d: Omit<EntryDraft, 'at'>, message = 'Kept in today.') => async () => ({ undo: (await keepEntry(db, { ...d, at: new Date() })).undo, message });
  const people = data?.people ?? [];
  switch (kind) {
    case 'media': return <MediaFormView {...media} keepSub={sub} onChange={setMedia} onKeep={() => keep(entry({ kind: 'media', text: media.note, data: { kind: 'media', media: media.media, title: media.title.trim(), rating: media.rating, current: media.current } }))} />;
    case 'quote': return <QuoteFormView {...quote} people={people} keepSub={sub} onChange={setQuote}
      onKeep={() => keep(entry({ kind: 'quote', text: quote.text, people: quote.who.length === 1 ? [quote.who] : [], data: { kind: 'quote', who: quote.who, ...(quote.where.trim() ? { where: quote.where.trim() } : {}) } }))} />;
    case 'place': return <PlaceFormView {...place} pos={pos} canLocate={typeof navigator !== 'undefined' && 'geolocation' in navigator} locating={locating} error={placeErr} places={data?.places ?? []} homes={data?.homes ?? []} keepSub={sub} onChange={setPlace}
      onLocate={() => { setLocating(true); setPlaceErr('');
        navigator.geolocation.getCurrentPosition(p => { setPos({ lat: roundCoord(p.coords.latitude), lon: roundCoord(p.coords.longitude) }); setLocating(false); },
          () => { setPlaceErr('Logbook couldn’t get your position. You can still keep the place.'); setLocating(false); }, { maximumAge: 60_000, timeout: 15_000 }); }}
      onKeep={() => keep(async () => { const placeId = await addPlace(db, { name: place.name, first: place.first, ...(pos ?? {}) }); return entry({ kind: 'place', text: '', data: { kind: 'place', placeId, first: place.first }, marks: place.first ? { first: true } : {} })(); })} />;
    case 'person': return <PersonFormView {...person} people={people} keepSub={sub} onChange={setPerson} onKeep={() => keep(entry({ kind: 'person', text: '', data: { kind: 'person', who: person.who, how: person.how } }))} />;
    case 'keep': return <KeepFormView name={keepsake.name} thumb={keepsake.thumb} keepSub={sub} onChange={setKeepsake}
      onPick={async f => { try { const r = await addPhoto(db, f, new Date()); setKeepsake({ photoId: r.photoId, thumb: (await db.photos.get(r.photoId))?.thumb }); } catch (e) { undo.fail(e); } }}
      onKeep={() => keep(entry({ kind: 'keep', text: keepsake.name, data: { kind: 'keep', ...(keepsake.photoId != null ? { photoId: keepsake.photoId } : {}) } }))} />;
    case 'span': return <SpanFormView {...span} error={spanErr} keepSub={sub} onChange={p => { setSpan(p); setSpanErr(''); }}
      onKeep={() => { if (span.to < span.from) { setSpanErr('The span ends before it starts.'); return; }
        void keep(async () => { const spanId = await addSpan(db, span); const r = await keepEntry(db, { kind: 'span', text: '', data: { kind: 'span', spanId }, at: new Date() });
          return { undo: { label: 'Kept', run: async () => { await r.undo.run(); await db.spans.delete(spanId); } }, message: `Kept ${span.name.trim()} on the calendar.` }; }); }} />;
    case 'past': return <PastFormView {...past} today={dayKey(now)} keepSub={past.date ? `It goes on ${words(past.date)}` : 'Choose the date first'} onChange={setPast}
      onKeep={() => keep(entry({ kind: 'past', text: past.text, data: { kind: 'past' }, day: past.date }, `Kept on ${words(past.date)}, written later.`))} />;
    case 'photo': return <PhotoFormView onPick={async files => { let n = 0; for (const f of files) { try { await addPhoto(db, f, new Date()); n++; } catch (e) { undo.fail(e); } } if (n === files.length) { go({ name: 'today' }); } }} />;
    case 'voice': return <VoiceForm />;
  }
}
