import type { LogbookDb } from './db';
import { dayKey } from '../domain/day';
import { resizeImage } from '../domain/image';
import { StorageFullError, type Undo } from './actions';

export class NotAnImageError extends Error { constructor() { super('That file isn’t a photo Logbook can read. Nothing was added.'); this.name = 'NotAnImageError'; } }
const once = (label: string, fn: () => Promise<unknown>): Undo => { let done = false; return { label, run: async () => { if (done) return; done = true; await fn(); } }; };
const full = (e: unknown) => (e as { name?: string }).name === 'QuotaExceededError' || (e as { inner?: { name?: string } }).inner?.name === 'QuotaExceededError';
/* A photo is kept at 1600 px with a 320 px thumbnail; the original is never stored. The day's first photo becomes its photo of the day. */
export async function addPhoto(db: LogbookDb, file: Blob, at: Date, resize: (b: Blob, max: number) => Promise<Blob> = resizeImage) {
  if (!file.type.startsWith('image/')) throw new NotAnImageError();
  let blob: Blob, thumb: Blob;
  try { [blob, thumb] = [await resize(file, 1600), await resize(file, 320)]; } catch { throw new NotAnImageError(); }
  const day = dayKey(at);
  try {
    return await db.transaction('rw', db.photos, db.days, async () => {
      const photoId = await db.photos.add({ day, blob, thumb, addedAt: Date.now() });
      const row = await db.days.get(day);
      if (!row?.potd) await db.days.put({ ...(row ?? { day }), potd: photoId });
      return { photoId, undo: once('Added a photo', () => db.transaction('rw', db.photos, db.days, async () => {
        await db.photos.delete(photoId);
        const r = await db.days.get(day); if (r?.potd === photoId) { const next = { ...r }; delete next.potd; await db.days.put(next); }
      })) };
    });
  } catch (e) { if (full(e)) throw new StorageFullError(); throw e; }
}
export async function removePhoto(db: LogbookDb, id: number): Promise<Undo> {
  const p = await db.photos.get(id); if (!p) return once('Nothing', async () => {});
  const row = await db.days.get(p.day);
  await db.transaction('rw', db.photos, db.days, async () => { await db.photos.delete(id); if (row?.potd === id) { const next = { ...row }; delete next.potd; await db.days.put(next); } });
  return once('Removed a photo', () => db.transaction('rw', db.photos, db.days, async () => { await db.photos.put(p); if (row) await db.days.put(row); }));
}
