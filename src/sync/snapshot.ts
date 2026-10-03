import type { LogbookDb } from '../db/db';
import { DAY_USER_FIELDS, REMOTE, SYNC_TABLES, isAuto, quietDeletes, uidFor, type SyncTable, type Tombstone } from '../db/syncMeta';

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
   A record whose file can't be fetched (or whose linked record isn't here) waits for the next sync instead of arriving half. */
export async function mergeSnapshot(db: LogbookDb, snap: Snapshot, getBlob: (name: string) => Promise<Blob | null>): Promise<Merged> {
  if (snap?.format !== 'logbook-sync' || snap.version !== 1) throw Object.assign(new Error('A sync file from a newer Logbook was found. Update Logbook on this device to sync.'), { name: 'PlainMessage' });
  const res: Merged = { added: 0, changed: 0, removed: 0, waiting: 0 };
  const deadAt = new Map((await db.tombstones.toArray()).map(t => [t.id, t.at]));
  const local = async (t: SyncTable, uid: string) => (isAuto(t) ? await db.table(t).where('uid').equals(uid).first() : await db.table(t).get(uid)) as Rec | undefined;
  const localId = async (t: 'places' | 'spans' | 'photos' | 'entries', uid: unknown) => (uid ? ((await db.table(t).where('uid').equals(String(uid)).first()) as Rec | undefined)?.id as number | undefined : undefined);
  let placesTouched = false;
  for (const t of ORDER) {
    for (const r of snap.records[t] ?? []) {
      const uid = isAuto(t) ? String(r.uid ?? '') : uidFor(t, r); if (!uid) continue;
      if ((deadAt.get(`${t}:${uid}`) ?? -1) >= Number(r.updatedAt ?? 0)) continue; // deleted here after that edit
      const l = await local(t, uid), x: Rec = { ...r };
      if (t === 'days' && l) { const m = await mergeDay(db, l, x); if (m) { await db.days.put({ ...m, [REMOTE]: true } as never); res.changed++; } continue; }
      if (!newer(x, l)) continue;
      // Local numbers for what this record points at; files fetched. Anything missing: wait.
      let ok = true;
      if (t === 'entries' && x.data) {
        const d = { ...(x.data as Rec) };
        if (d.kind === 'place') { const id = await localId('places', d.placeUid); if (id == null) ok = false; else { d.placeId = id; delete d.placeUid; } }
        if (d.kind === 'span') { const id = await localId('spans', d.spanUid); if (id == null) ok = false; else { d.spanId = id; delete d.spanUid; } }
        if (d.kind === 'keep' && d.photoUid) { const id = await localId('photos', d.photoUid); if (id == null) ok = false; else { d.photoId = id; delete d.photoUid; } }
        if (d.kind === 'voice') { const b = await getBlob(String(d.audioFile)); if (!b) ok = false; else { d.audio = b; delete d.audioFile; } }
        x.data = d;
      }
      if (t === 'moments' && x.entryUid) { const id = await localId('entries', x.entryUid); if (id == null) ok = false; else { x.entryId = id; delete x.entryUid; } }
      if (t === 'days' && x.potdUid) { const id = await localId('photos', x.potdUid); if (id != null) x.potd = id; delete x.potdUid; }
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
/* A day merged by part: the owner's fields from whichever device changed them last, stamps from both (weather can be fetched again). */
async function mergeDay(db: LogbookDb, l: Rec, r: Rec): Promise<Rec | null> {
  const userR = Number(r.userAt ?? 0) > Number(l.userAt ?? 0), stampsR = newer(r, l);
  if (!userR && !stampsR) return null;
  const out: Rec = { ...l };
  if (userR) {
    for (const f of DAY_USER_FIELDS) { if (f === 'potd') continue; if (r[f] === undefined) delete out[f]; else out[f] = r[f]; }
    const pid = r.potdUid ? ((await db.photos.where('uid').equals(String(r.potdUid)).first())?.id) : undefined;
    if (pid != null) out.potd = pid; else delete out.potd;
    out.userAt = r.userAt;
  }
  out.stamps = stampsR ? { ...(l.stamps as Rec), ...(r.stamps as Rec) } : { ...(r.stamps as Rec), ...(l.stamps as Rec) };
  out.updatedAt = Math.max(Number(l.updatedAt ?? 0), Number(r.updatedAt ?? 0));
  return out;
}
/* How often each place was visited is counted from the visits themselves, so the two devices agree. */
async function recountVisits(db: LogbookDb) {
  const n = new Map<number, number>();
  for (const e of await db.entries.where('kind').equals('place').toArray()) if (e.data?.kind === 'place') n.set(e.data.placeId, (n.get(e.data.placeId) ?? 0) + 1);
  for (const p of await db.places.toArray()) { const v = n.get(p.id!) ?? 0; if (v !== p.visits) await db.places.put({ ...p, visits: v, [REMOTE]: true } as never); }
}
