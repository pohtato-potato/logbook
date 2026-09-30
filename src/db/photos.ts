import type { LogbookDb } from './db';
import { dayKey, timeZone } from '../domain/day';
import { makePhoto, resizeImage } from '../domain/image';
import { StorageFullError, type Undo } from './actions';

export class NotAnImageError extends Error { constructor() { super('That file isn’t a photo Logbook can read. Nothing was added.'); this.name = 'NotAnImageError'; } }
type Resize = (b: Blob, max: number) => Promise<Blob>;
const once = (label: string, fn: () => Promise<unknown>): Undo => { let done = false; return { label, run: async () => { if (done) return; done = true; await fn(); } }; };
const full = (e: unknown) => (e as { name?: string }).name === 'QuotaExceededError' || (e as { inner?: { name?: string } }).inner?.name === 'QuotaExceededError';
async function write<T>(fn: () => Promise<T>): Promise<T> { try { return await fn(); } catch (e) { if (full(e)) throw new StorageFullError(); throw e; } }
/* A photo is kept at 1600 px with a 320 px thumbnail; the original is never stored. Resizing happens before anything is written. */
async function prepare(file: Blob, resize: Resize) {
  if (!file.type.startsWith('image/')) throw new NotAnImageError();
  try { return resize === resizeImage ? await makePhoto(file) : { blob: await resize(file, 1600), thumb: await resize(file, 320) }; } catch { throw new NotAnImageError(); } // the real path decodes once; tests inject their own resize
}
/* Inside a transaction: store the photo; the day's first photo becomes its photo of the day. Returns how to take it back. */
async function store(db: LogbookDb, day: string, p: { blob: Blob; thumb: Blob }) {
  const photoId = await db.photos.add({ day, ...p, addedAt: Date.now() }), row = await db.days.get(day);
  if (!row?.potd) await db.days.put({ ...(row ?? { day }), potd: photoId });
  return { photoId, remove: async () => { await db.photos.delete(photoId); const r = await db.days.get(day); if (r?.potd === photoId) { const next = { ...r }; delete next.potd; await db.days.put(next); } } };
}
export async function addPhoto(db: LogbookDb, file: Blob, at: Date, resize: Resize = resizeImage) {
  const p = await prepare(file, resize), day = dayKey(at);
  return write(() => db.transaction('rw', db.photos, db.days, async () => {
    const s = await store(db, day, p);
    return { photoId: s.photoId, undo: once('Added a photo', () => db.transaction('rw', db.photos, db.days, s.remove)) };
  }));
}
/* Several photos at once: the readable ones are added, the rest counted, and one Undo takes back all that were added. */
export async function addPhotos(db: LogbookDb, files: Blob[], at: Date, resize: Resize = resizeImage) {
  const added: Undo[] = []; let failed = 0;
  for (const f of files) { try { added.push((await addPhoto(db, f, at, resize)).undo); } catch (e) { if (e instanceof NotAnImageError) failed++; else throw e; } }
  return { added: added.length, failed, undo: once('Added photos', async () => { for (const u of added) await u.run(); }) };
}
export function photosMessage(added: number, failed: number) {
  if (!added) return failed === 1 ? 'That file isn’t a photo Logbook can read. Nothing was added.' : 'Those files aren’t photos Logbook can read. Nothing was added.';
  const a = added === 1 ? 'Added the photo.' : `Added ${added} photos.`;
  return failed ? `${a} ${failed} ${failed === 1 ? 'file wasn’t a photo' : 'files weren’t photos'} Logbook can read.` : a;
}
/* A keepsake and its photo are written together, only on Keep; Undo removes both. */
export async function keepKeepsake(db: LogbookDb, k: { name: string; file?: Blob; at: Date }, resize: Resize = resizeImage) {
  const p = k.file ? await prepare(k.file, resize) : null, day = dayKey(k.at);
  return write(() => db.transaction('rw', db.entries, db.photos, db.days, async () => {
    const s = p ? await store(db, day, p) : null;
    const entryId = await db.entries.add({ day, at: k.at.getTime(), tz: timeZone(), kind: 'keep', text: k.name.trim(), marks: {}, tags: [], people: [], writtenAt: Date.now(), data: { kind: 'keep', ...(s ? { photoId: s.photoId } : {}) } });
    return { entryId, undo: once('Kept', () => db.transaction('rw', db.entries, db.photos, db.days, async () => { await db.entries.delete(entryId); await s?.remove(); })) };
  }));
}
export async function removePhoto(db: LogbookDb, id: number): Promise<Undo> {
  const p = await db.photos.get(id); if (!p) return once('Nothing', async () => {});
  const row = await db.days.get(p.day);
  await db.transaction('rw', db.photos, db.days, async () => { await db.photos.delete(id); if (row?.potd === id) { const next = { ...row }; delete next.potd; await db.days.put(next); } });
  return once('Removed a photo', () => db.transaction('rw', db.photos, db.days, async () => { await db.photos.put(p); if (row) await db.days.put(row); }));
}
