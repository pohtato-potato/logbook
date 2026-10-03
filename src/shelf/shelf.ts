/* The shelf, version 2: one small IndexedDB on the shared website where the family's apps leave cards for each other.
   This file is the contract. It lives in the suite repository; every app keeps a byte-identical copy, pinned by a test.
   It has no imports, so any app can copy it as it is.

   - One store, `cards`, keyed by id, indexed by reader (`to`) and by reader and format.
   - Every card names its sender and reader, its format and version, what it's about (a day, an item, or nothing), and its data.
   - Readers use a card only when CHECK passes for its format and version; anything else is ignored.
   - Writers replace their own cards by id.
   - Version 1's `postcards` store is never created (Health's v1 never shipped). */

export const SHELF_DB = 'shelf', SHELF_VERSION = 2, STORE = 'cards';
export type App = 'media' | 'logbook' | 'health';
export type About = { day: string } | { item: string } | Record<string, never>;
export type Card<F extends string = string, D = unknown> = { id: string; format: F; version: number; from: App; to: App; about: About; writtenAt: number; data: D };

/* What each card carries. */
export type Feeling = { w: string; family: string };
export type MediaDay = { day: string; items: { workId: string; kind: string; title: string; did: ('noted' | 'started' | 'finished' | 'rated')[]; rating?: number; line?: string }[]; feelings: Feeling[] };
export type MediaCatalogue = { works: { id: string; kind: string; title: string; year?: number }[] };
export type LogbookMention = { workId: string; day: string; line: string; feelings: Feeling[] };
/* rev: the entry's revision (when it last changed). A receipt names the revision Media holds, so an entry edited after it moved is moved again before Logbook lets it go. */
export type LogbookHandover = { uid: string; rev: number; day: string; at: number; media: 'Film' | 'Series' | 'Book' | 'Game' | 'Album' | 'Other'; title: string; rating: number; current: boolean; text: string };
export type MediaReceipt = { uid: string; rev: number; workId: string };
export type LogbookShare = { title: string; text: string; url: string };
export type HealthDay = {
  day: string; steps: number | null; sleepMin: number | null;
  workout: { name: string; minutes: number } | null; checkin: { at: number } | null;
  walk: { km: number; place: string; next?: string } | null;
  rings: { workout: number; sleep: number; steps: number }; line: string;
};

type R = Record<string, unknown>;
const obj = (x: unknown): x is R => !!x && typeof x === 'object' && !Array.isArray(x);
const str = (x: unknown, max = 2000) => typeof x === 'string' && x.length <= max;
const num = (x: unknown, min = 0, max = Infinity) => typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max;
const isDay = (x: unknown) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);
/* The nine feeling families both apps draw (Logbook's vocabulary). Any other family is refused, so no reader meets a form it can't draw. */
export const FAMILIES = ['bright', 'proud', 'curious', 'calm', 'warm', 'wistful', 'low', 'tense', 'heated'];
const feelings = (x: unknown) => Array.isArray(x) && x.length <= 50 && x.every(f => obj(f) && str(f.w, 60) && FAMILIES.includes(f.family as string));
const opt = (x: unknown, ok: (v: R) => boolean) => x === null || x === undefined || (obj(x) && ok(x));
const DID = new Set(['noted', 'started', 'finished', 'rated']);
const MEDIA = new Set(['Film', 'Series', 'Book', 'Game', 'Album', 'Other']);

/* The data check for each `format@version`. A reader uses nothing that fails. */
export const CHECK: Record<string, (d: unknown) => boolean> = {
  'media.day@1': d => obj(d) && isDay(d.day) && feelings(d.feelings) && Array.isArray(d.items) && d.items.length <= 200
    && d.items.every(i => obj(i) && str(i.workId, 100) && str(i.kind, 20) && str(i.title, 500) && Array.isArray(i.did) && i.did.every(x => DID.has(x as string))
      && (i.rating === undefined || num(i.rating, 1, 7)) && (i.line === undefined || str(i.line, 600))),
  'media.catalogue@1': d => obj(d) && Array.isArray(d.works) && d.works.length <= 5000
    && d.works.every(w => obj(w) && str(w.id, 100) && str(w.kind, 20) && str(w.title, 500) && (w.year === undefined || num(w.year, 0, 3000))),
  'logbook.mention@1': d => obj(d) && str(d.workId, 100) && isDay(d.day) && str(d.line) && feelings(d.feelings),
  'logbook.handover@1': d => obj(d) && str(d.uid, 100) && num(d.rev) && isDay(d.day) && num(d.at) && MEDIA.has(d.media as string) && str(d.title, 500)
    && num(d.rating, 0, 7) && typeof d.current === 'boolean' && str(d.text, 20000),
  'media.receipt@1': d => obj(d) && str(d.uid, 100) && num(d.rev) && str(d.workId, 100),
  'logbook.share@1': d => obj(d) && str(d.title) && str(d.text) && str(d.url) && !!(d.title || d.text || d.url),
  'health.day@2': d => obj(d) && isDay(d.day) && (d.steps === null || num(d.steps, 0, 500_000)) && (d.sleepMin === null || num(d.sleepMin, 0, 24 * 60))
    && opt(d.workout, w => str(w.name, 200) && num(w.minutes, 0, 24 * 60)) && opt(d.checkin, c => num(c.at)) && opt(d.walk, w => num(w.km) && str(w.place, 200))
    && obj(d.rings) && num(d.rings.workout, 0, 1) && num(d.rings.sleep, 0, 1) && num(d.rings.steps, 0, 1) && str(d.line, 300),
};
const APPS = new Set(['media', 'logbook', 'health']);

/* A card exactly as the contract says, or null. */
export function parseCard(raw: unknown): Card | null {
  if (!obj(raw) || !str(raw.id, 200) || !str(raw.format, 60) || !num(raw.version, 1, 1000) || !APPS.has(raw.from as string) || !APPS.has(raw.to as string) || !num(raw.writtenAt) || !obj(raw.about)) return null;
  const check = CHECK[`${raw.format}@${raw.version}`];
  return check && check(raw.data) ? (raw as unknown as Card) : null;
}

export function openShelf(idb: IDBFactory = indexedDB): Promise<IDBDatabase> {
  return new Promise((ok, no) => {
    const req = idb.open(SHELF_DB, SHELF_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) { const s = db.createObjectStore(STORE, { keyPath: 'id' }); s.createIndex('to', 'to'); s.createIndex('to_format', ['to', 'format']); }
    };
    req.onsuccess = () => ok(req.result); req.onerror = () => no(req.error); req.onblocked = () => no(new Error('The shelf is busy in another tab.'));
  });
}
const done = (t: IDBTransaction) => new Promise<void>((ok, no) => { t.oncomplete = () => ok(); t.onerror = () => no(t.error); t.onabort = () => no(t.error); });

/* Leaves cards, replacing any with the same id. */
export async function putCards(cards: Card[], idb?: IDBFactory): Promise<void> {
  const db = await openShelf(idb);
  try { const t = db.transaction(STORE, 'readwrite'); for (const c of cards) t.objectStore(STORE).put(c); await done(t); } finally { db.close(); }
}
/* Every card left for one reader (raw: pass each through parseCard), optionally of one format. */
export async function cardsFor(to: App, format?: string, idb?: IDBFactory): Promise<unknown[]> {
  const db = await openShelf(idb);
  try {
    const s = db.transaction(STORE).objectStore(STORE), q = format ? s.index('to_format').getAll([to, format]) : s.index('to').getAll(to);
    return await new Promise((ok, no) => { q.onsuccess = () => ok(q.result as unknown[]); q.onerror = () => no(q.error); });
  } finally { db.close(); }
}
export async function removeCards(ids: string[], idb?: IDBFactory): Promise<void> {
  const db = await openShelf(idb);
  try { const t = db.transaction(STORE, 'readwrite'); for (const id of ids) t.objectStore(STORE).delete(id); await done(t); } finally { db.close(); }
}
