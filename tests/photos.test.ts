import { beforeEach, describe, expect, it } from 'vitest';
import { fitSize } from '../src/domain/image';
import { openDb, type LogbookDb } from '../src/db/db';
import { NotAnImageError, addPhoto, removePhoto } from '../src/db/photos';

let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('ph-' + n++); await db.open(); });
const fake = (size: number) => async (_b: Blob, max: number) => new Blob([`${max}:${size}`], { type: 'image/jpeg' });
const at = new Date('2026-09-29T12:00:00');

describe('photo sizes', () => {
  it('fits the long edge to 1600 and never enlarges', () => {
    expect(fitSize(4000, 3000, 1600)).toEqual({ w: 1600, h: 1200 });
    expect(fitSize(3000, 4000, 1600)).toEqual({ w: 1200, h: 1600 });
    expect(fitSize(800, 600, 1600)).toEqual({ w: 800, h: 600 });
  });
});
describe('adding photos', () => {
  it('stores a resized photo and a thumbnail; the first becomes the photo of the day', async () => {
    const r = await addPhoto(db, new Blob(['x'], { type: 'image/png' }), at, fake(1));
    const p = await db.photos.get(r.photoId);
    expect(await p!.blob.text()).toBe('1600:1'); expect(await p!.thumb.text()).toBe('320:1');
    expect((await db.days.get('2026-09-29'))?.potd).toBe(r.photoId);
    const r2 = await addPhoto(db, new Blob(['y'], { type: 'image/jpeg' }), at, fake(2));
    expect((await db.days.get('2026-09-29'))?.potd).toBe(r.photoId);
    await r2.undo.run(); expect(await db.photos.count()).toBe(1);
  });
  it('refuses something that isn’t an image, and saves nothing', async () => {
    await expect(addPhoto(db, new Blob(['%PDF'], { type: 'application/pdf' }), at, fake(1))).rejects.toBeInstanceOf(NotAnImageError);
    expect(await db.photos.count()).toBe(0);
  });
  it('a photo the phone cannot read is refused the same way', async () => {
    await expect(addPhoto(db, new Blob(['junk'], { type: 'image/heic' }), at, async () => { throw new Error('decode'); })).rejects.toBeInstanceOf(NotAnImageError);
    expect(await db.photos.count()).toBe(0);
  });
  it('removing the photo of the day clears it, and Undo brings both back', async () => {
    const r = await addPhoto(db, new Blob(['x'], { type: 'image/png' }), at, fake(1));
    const u = await removePhoto(db, r.photoId);
    expect((await db.days.get('2026-09-29'))?.potd).toBeUndefined();
    await u.run(); expect((await db.days.get('2026-09-29'))?.potd).toBe(r.photoId);
  });
});
