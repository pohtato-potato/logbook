import { removeEntry } from '../db/actions';
import type { LogbookDb } from '../db/db';
import type { Entry } from '../db/types';
import { cardsFor, parseCard, putCards, removeCards, type Card, type LogbookHandover, type MediaReceipt } from './shelf';

/* The hand-over to Media, done once (spec §12): every film, book and show entry goes onto the shelf as a logbook.handover card;
   Media brings each in and answers with a media.receipt. Only when every one has a receipt does Logbook offer to save a backup of
   its copies and let them go (owner's choices B and 6A). Nothing is deleted before it has arrived safely in Media. */
const moved = async (db: LogbookDb) => (await db.entries.where('kind').equals('media').toArray()).filter(e => e.data?.kind === 'media' && e.uid);
const card = (e: Entry, now: number): Card<'logbook.handover', LogbookHandover> => {
  const d = e.data as Extract<Entry['data'], { kind: 'media' }>;
  return { id: `logbook.handover:${e.uid}`, format: 'logbook.handover', version: 1, from: 'logbook', to: 'media', about: { item: e.uid! }, writtenAt: now,
    data: { uid: e.uid!, day: e.day, at: e.at, media: d.media, title: d.title.slice(0, 500), rating: d.rating, current: d.current, text: e.text.slice(0, 20000) } };
};

/* Leaves (or refreshes) a card for every film, book and show still in Logbook. Safe to run on every start. */
export async function writeHandovers(db: LogbookDb, idb?: IDBFactory, now = Date.now()): Promise<number> {
  const es = await moved(db);
  if (es.length) await putCards(es.map(e => card(e, now)), idb);
  return es.length;
}

async function receipts(idb?: IDBFactory): Promise<Set<string>> {
  return new Set((await cardsFor('logbook', 'media.receipt', idb)).map(parseCard).flatMap(c => (c ? [(c.data as MediaReceipt).uid] : [])));
}

/* How far the move has got. Ready once every entry has a receipt. */
export async function handoverState(db: LogbookDb, idb?: IDBFactory): Promise<{ total: number; received: number; ready: boolean }> {
  const [es, got] = [await moved(db), await receipts(idb)];
  const received = es.filter(e => got.has(e.uid!)).length;
  return { total: es.length, received, ready: es.length > 0 && received === es.length };
}

/* The backup saved before letting go: every moved entry, whole, as JSON. */
export function movedBackup(entries: Entry[], now = new Date()): Blob {
  return new Blob([JSON.stringify({ format: 'logbook-media-handover', version: 1, exportedAt: now.toISOString(), entries }, null, 1)], { type: 'application/json' });
}

/* Removes the entries Media has received (ordinary removals, so the other device's Logbook follows through sync), and their cards. */
export async function letGo(db: LogbookDb, idb?: IDBFactory): Promise<number> {
  const [es, got] = [await moved(db), await receipts(idb)];
  const gone = es.filter(e => got.has(e.uid!));
  for (const e of gone) await removeEntry(db, e.id!);
  if (gone.length) await removeCards(gone.map(e => `logbook.handover:${e.uid}`), idb);
  return gone.length;
}
