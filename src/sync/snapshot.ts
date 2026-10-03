import type { LogbookDb } from '../db/db';
import { DAY_USER_FIELDS, REMOTE, SYNC_TABLES, isAuto, quietDeletes, seeTime, uidFor, type SyncTable, type Tombstone } from '../db/syncMeta';

/* One device's whole Logbook as it travels through Drive: every synced record (local numbers swapped for uids, files for
   file names) and every delete it knows about. Settings never travel: they are this device's own (the lock is tied to it). */
export type Rec = Record<string, unknown>;
export type Snapshot = { format: 'logbook-sync'; version: 1; device: string; label: string; at: number; records: Partial<Record<SyncTable, Rec[]>>; tombstones: Tombstone[] };
export type Merged = { added: number; changed: number; removed: number; waiting: number };
/* The order a merge runs in: what is pointed at arrives before what points at it. */
const ORDER: SyncTable[] = ['places', 'spans', 'people', 'words', 'tags', 'photos', 'entries', 'moments', 'days', 'postcards', 'songs'];
export const fileName = (kind: 'photo' | 'thumb' | 'audio', uid: string) => `${kind}-${uid}`;

async function idToUid(db: LogbookDb, t: 'places' | 'spans' | 'photos' | 'entries') {
  return new Map((await db.table(t).toArray()).map((r: Rec) => [r.id as number, r.uid as string]));
}
export async function makeSnapshot(db: LogbookDb, device: string, label: string, now = Date.now()): Promise<{ snap: Snapshot; blobs: Map<string, () => Promise<Blob>> }> {
  const [places, spans, photos, entries] = await Promise.all([idToUid(db, 'places'), idToUid(db, 'spans'), idToUid(db, 'photos'), idToUid(db, 'entries')]);
  const blobs = new Map<string, () => Promise<Blob>>(), records: Snapshot['records'] = {};
  for (const t of SYNC_TABLES) {
    const out: Rec[] = [];
    for (const r of (await db.table(t).toArray()) as Rec[]) {
      const { id: _id, ...x } = r; const uid = isAuto(t) ? String(r.uid) : uidFor(t, r);
      if (t === 'entries' && x.data) {
        const d = { ...(x.data as Rec) };
        if (d.kind === 'place') { d.placeUid = places.get(d.placeId as number); delete d.placeId; }
        if (d.kind === 'span') { d.spanUid = spans.get(d.spanId as number); delete d.spanId; }
        if (d.kind === 'keep' && d.photoId != null) { d.photoUid = photos.get(d.photoId as number); delete d.photoId; }
        if (d.kind === 'voice') { const audio = d.audio as Blob, f = fileName('audio', uid); blobs.set(f, async () => audio); d.audioFile = f; delete d.audio; }
        x.data = d;
      }
      if (t === 'moments' && x.entryId != null) { x.entryUid = entries.get(x.entryId as number); delete x.entryId; }
      if (t === 'days' && x.potd != null) { x.potdUid = photos.get(x.potd as number); delete x.potd; }
      if (t === 'photos') { const b = r.blob as Blob, th = r.thumb as Blob; blobs.set(fileName('photo', uid), async () => b); blobs.set(fileName('thumb', uid), async () => th); delete x.blob; delete x.thumb; }
      out.push(x);
    }
    records[t] = out;
  }
  return { snap: { format: 'logbook-sync', version: 1, device, label, at: now, records, tombstones: await db.tombstones.toArray() }, blobs };
}

const newer = (a: Rec, b?: Rec) => !b || Number(a.updatedAt ?? 0) > Number(b.updatedAt ?? 0);
/* Merges another device's snapshot: per record, the newest edit wins; a delete wins over anything older than it.
   A record whose file can't be fetched yet (a photo, a voice note, or something that points at a photo still on its way)
   waits for the next sync instead of arriving half. A link to something deleted, or gone, is dropped instead: that can't heal. */
export async function mergeSnapshot(db: LogbookDb, snap: Snapshot, getBlob: (name: string) => Promise<Blob | null>): Promise<Merged> {
  if (snap?.format !== 'logbook-sync' || snap.version !== 1) throw Object.assign(new Error('A sync file from a newer Logbook was found. Update Logbook on this device to sync.'), { name: 'PlainMessage' });
  const res: Merged = { added: 0, changed: 0, removed: 0, waiting: 0 };
  const deadAt = new Map((await db.tombstones.toArray()).map(t => [t.id, t.at]));
  const local = async (t: SyncTable, uid: string) => (isAuto(t) ? await db.table(t).where('uid').equals(uid).first() : await db.table(t).get(uid)) as Rec | undefined;
  const localId = async (t: 'places' | 'spans' | 'photos' | 'entries', uid: unknown) => (uid ? ((await db.table(t).where('uid').equals(String(uid)).first()) as Rec | undefined)?.id as number | undefined : undefined);
  let placesTouched = false;
  // What the other device holds, so a link to a record still on its way (waiting) can be told from a link to one that's gone.
  const sent = new Map(ORDER.map(t => [t, new Set((snap.records[t] ?? []).map(r => (isAuto(t) ? String(r.uid ?? '') : uidFor(t, r))))]));
  const pending = (t: SyncTable, uid: unknown) => !!uid && sent.get(t)!.has(String(uid)) && (deadAt.get(`${t}:${uid}`) ?? -1) < 0;
  for (const tb of snap.tombstones ?? []) seeTime(tb.at);
  for (const t of ORDER) {
    for (const r of snap.records[t] ?? []) {
      seeTime(r.updatedAt);
      const uid = isAuto(t) ? String(r.uid ?? '') : uidFor(t, r); if (!uid) continue;
      if ((deadAt.get(`${t}:${uid}`) ?? -1) >= Number(r.updatedAt ?? 0)) continue; // deleted here after that edit
      const l = await local(t, uid), x: Rec = { ...r };
      if (t === 'days') { const m = await mergeDay(db, l ?? { day: x.day }, x); if (m.waiting) res.waiting++; if (m.row) { await db.days.put({ ...m.row, [REMOTE]: true } as never); if (l) res.changed++; else res.added++; } continue; }
      if (!newer(x, l)) continue;
      // Local numbers for what this record points at; files fetched. Anything missing: wait.
      let ok = true;
      if (t === 'entries' && x.data) {
        const d = { ...(x.data as Rec) };
        if (d.kind === 'place') { d.placeId = (await localId('places', d.placeUid)) ?? -1; delete d.placeUid; } // a place that's gone: kept as "a place that was removed"
        if (d.kind === 'span') { d.spanId = (await localId('spans', d.spanUid)) ?? -1; delete d.spanUid; }
        if (d.kind === 'keep' && d.photoUid) { const id = await localId('photos', d.photoUid); if (id != null) d.photoId = id; else if (pending('photos', d.photoUid)) ok = false; else delete d.photoId; delete d.photoUid; }
        if (d.kind === 'voice') { const b = await getBlob(String(d.audioFile)); if (!b) ok = false; else { d.audio = b; delete d.audioFile; } }
        x.data = d;
      }
      if (t === 'moments' && x.entryUid) { const id = await localId('entries', x.entryUid); if (id != null) { x.entryId = id; delete x.entryUid; } else if (pending('entries', x.entryUid)) ok = false; else continue; }
      if (t === 'photos') { const [b, th] = await Promise.all([getBlob(fileName('photo', uid)), getBlob(fileName('thumb', uid))]); if (!b || !th) ok = false; else { x.blob = b; x.thumb = th; } }
      if (!ok) { res.waiting++; continue; }
      await db.table(t).put({ ...x, ...(l && isAuto(t) ? { id: l.id } : {}), [REMOTE]: true });
      if (l) res.changed++; else res.added++;
      if (t === 'places' || (t === 'entries' && (x.data as Rec | undefined)?.kind === 'place')) placesTouched = true;
    }
  }
  for (const tb of snap.tombstones ?? []) {
    if (!SYNC_TABLES.includes(tb.table) || (deadAt.get(tb.id) ?? -1) >= tb.at) continue;
    const l = await local(tb.table, tb.uid);
    if (l && Number(l.updatedAt ?? 0) > tb.at) continue; // changed here after it was deleted there: keep it
    if (l) { quietDeletes.add(tb.id); await db.table(tb.table).delete(isAuto(tb.table) ? (l.id as number) : tb.uid); res.removed++; if (tb.table === 'entries') placesTouched = true; }
    await db.tombstones.put(tb);
  }
  if (placesTouched) await recountVisits(db);
  return res;
}
/* A day merged field by field: each of the owner's fields (overall, grateful, headline, photo of the day) from whichever
   device changed it last; stamps from both (weather can be fetched again). A photo of the day whose photo hasn't arrived waits. */
async function mergeDay(db: LogbookDb, l: Rec, r: Rec): Promise<{ row: Rec | null; waiting: boolean }> {
  const out: Rec = { ...l }, lf = { ...(l.fieldAt as Rec) }, rf = (r.fieldAt as Rec) ?? {};
  let changed = false, waiting = false;
  for (const f of DAY_USER_FIELDS) {
    if (Number(rf[f] ?? 0) <= Number(lf[f] ?? 0)) continue;
    if (f === 'potd') {
      if (r.potdUid) { const id = (await db.photos.where('uid').equals(String(r.potdUid)).first())?.id; if (id == null) { waiting = true; continue; } out.potd = id; }
      else delete out.potd;
    } else if (r[f] === undefined) delete out[f]; else out[f] = r[f];
    lf[f] = rf[f]; changed = true;
  }
  if (Number(r.updatedAt ?? 0) > Number(l.updatedAt ?? 0)) { out.stamps = { ...(l.stamps as Rec), ...(r.stamps as Rec) }; changed = true; }
  else if (r.stamps && !l.stamps) { out.stamps = r.stamps; changed = true; }
  if (!changed) return { row: null, waiting };
  out.fieldAt = lf; out.updatedAt = Math.max(Number(l.updatedAt ?? 0), Number(r.updatedAt ?? 0));
  delete out.potdUid;
  return { row: out, waiting };
}
/* How often each place was visited is counted from the visits themselves, so the two devices agree. */
async function recountVisits(db: LogbookDb) {
  const n = new Map<number, number>();
  for (const e of await db.entries.where('kind').equals('place').toArray()) if (e.data?.kind === 'place') n.set(e.data.placeId, (n.get(e.data.placeId) ?? 0) + 1);
  for (const p of await db.places.toArray()) { const v = n.get(p.id!) ?? 0; if (v !== p.visits) await db.places.put({ ...p, visits: v, [REMOTE]: true } as never); }
}
