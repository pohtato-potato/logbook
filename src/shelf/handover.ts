import { once, removeEntry } from '../db/actions';
import type { Undo } from '../db/actions';
import type { LogbookDb } from '../db/db';
import type { Entry } from '../db/types';
import { cardsFor, parseCard, putCards, removeCards, type Card, type LogbookHandover, type MediaReceipt } from './shelf';

/* The hand-over to Media, done once (spec §12): every film, book and show entry goes onto the shelf as a logbook.handover card,
   carrying its revision; Media brings each in and answers with a media.receipt naming the revision it holds. Logbook lets an entry go
   only when Media holds its latest revision and Media's card for that day is on the shelf (so the day still shows it), after the owner
   has saved a backup, and with one Undo. Private entries stay in Logbook. Nothing is deleted before it has arrived safely in Media. */
export const revOf = (e: Entry) => e.updatedAt ?? e.writtenAt;
const isMedia = (e: Entry) => e.data?.kind === 'media' && !!e.uid;
const moved = async (db: LogbookDb) => (await db.entries.where('kind').equals('media').toArray()).filter(e => isMedia(e) && !e.marks.priv);
const card = (e: Entry, now: number): Card<'logbook.handover', LogbookHandover> => {
  const d = e.data as Extract<Entry['data'], { kind: 'media' }>;
  return { id: `logbook.handover:${e.uid}`, format: 'logbook.handover', version: 1, from: 'logbook', to: 'media', about: { item: e.uid! }, writtenAt: now,
    data: { uid: e.uid!, rev: revOf(e), day: e.day, at: e.at, media: d.media, title: d.title.slice(0, 500), rating: d.rating, current: d.current, text: e.text.slice(0, 20000) } };
};

/* Leaves (or refreshes, with the latest revision) a card for every film, book and show still in Logbook. Safe on every start. */
export async function writeHandovers(db: LogbookDb, idb?: IDBFactory, now = Date.now()): Promise<number> {
  const es = await moved(db);
  if (es.length) await putCards(es.map(e => card(e, now)), idb);
  return es.length;
}

async function onShelf(idb?: IDBFactory) {
  const cards = (await cardsFor('logbook', undefined, idb)).map(parseCard).filter((c): c is Card => !!c);
  return {
    receipts: new Map(cards.filter(c => c.format === 'media.receipt').map(c => [(c.data as MediaReceipt).uid, (c.data as MediaReceipt).rev])),
    days: new Set(cards.filter(c => c.format === 'media.day').map(c => (c.about as { day: string }).day)),
  };
}
/* Safe to let go: Media holds this revision, and Media's card for its day is on the shelf. */
const safe = (e: Entry, s: Awaited<ReturnType<typeof onShelf>>) => s.receipts.get(e.uid!) === revOf(e) && s.days.has(e.day);

/* How far the move has got. Ready once every entry is safe. Private entries are counted apart: they stay. */
export async function handoverState(db: LogbookDb, idb?: IDBFactory): Promise<{ total: number; received: number; ready: boolean; private: number }> {
  const [all, es, s] = [await db.entries.where('kind').equals('media').toArray(), await moved(db), await onShelf(idb)];
  const received = es.filter(e => s.receipts.get(e.uid!) === revOf(e)).length;
  return { total: es.length, received, ready: es.length > 0 && es.every(e => safe(e, s)), private: all.filter(e => isMedia(e) && e.marks.priv).length };
}

/* The backup saved before letting go: every moved entry, whole, as JSON. */
export function movedBackup(entries: Entry[], now = new Date()): Blob {
  return new Blob([JSON.stringify({ format: 'logbook-media-handover', version: 1, exportedAt: now.toISOString(), entries }, null, 1)], { type: 'application/json' });
}

/* Removes the entries that are safe (ordinary removals, so the other device's Logbook follows through sync), and their cards.
   One Undo brings them all back (their cards are written again on the next look). */
export async function letGo(db: LogbookDb, idb?: IDBFactory): Promise<{ count: number; undo: Undo }> {
  const [es, s] = [await moved(db), await onShelf(idb)];
  const gone = es.filter(e => safe(e, s)), undos: Undo[] = [];
  for (const e of gone) undos.push(await removeEntry(db, e.id!));
  if (gone.length) await removeCards(gone.map(e => `logbook.handover:${e.uid}`), idb);
  return { count: gone.length, undo: once('Brought back', async () => { for (const u of undos) await u.run(); }) };
}
