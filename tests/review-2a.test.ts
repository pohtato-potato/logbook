import { beforeEach, describe, expect, it } from 'vitest';
import { openDb, type LogbookDb } from '../src/db/db';
import { keepPlace, keepSpan, removeEntry, keepEntry } from '../src/db/actions';
import { keepKeepsake, addPhotos, photosMessage } from '../src/db/photos';
import { makeBackupZip, restoreBackupFile, makeBackup } from '../src/db/backup';

let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('r2a-' + n++); await db.open(); });
const at = new Date('2026-09-29T20:00:00');
const img = async (_b: Blob, max: number) => new Blob([`jpeg-${max}`], { type: 'image/jpeg' });
const png = () => new Blob(['x'], { type: 'image/png' }), pdf = () => new Blob(['%PDF'], { type: 'application/pdf' });

describe('a keepsake and its photo are kept together', () => {
  it('nothing is stored until Keep, and Undo removes both', async () => {
    const r = await keepKeepsake(db, { name: 'Ticket', file: png(), at }, img);
    expect(await db.photos.count()).toBe(1);
    const e = await db.entries.get(r.entryId); expect(e?.data).toEqual({ kind: 'keep', photoId: (await db.photos.toArray())[0].id });
    await r.undo.run();
    expect(await db.entries.count()).toBe(0); expect(await db.photos.count()).toBe(0); expect((await db.days.get('2026-09-29'))?.potd).toBeUndefined();
  });
  it('a picked file that is not a photo saves nothing at all', async () => {
    await expect(keepKeepsake(db, { name: 'Ticket', file: pdf(), at }, img)).rejects.toThrow();
    expect(await db.entries.count()).toBe(0); expect(await db.photos.count()).toBe(0);
  });
});
describe('places and spans save all or nothing, and Undo or Remove tidy up', () => {
  it('Undo of a new place removes the place too', async () => {
    const r = await keepPlace(db, { name: 'New café', first: true, lat: 10.001, lon: 20.001, at });
    expect(await db.places.count()).toBe(1);
    await r.undo.run(); expect(await db.places.count()).toBe(0); expect(await db.entries.count()).toBe(0);
  });
  it('Undo of a visit to a known place restores it exactly, position included', async () => {
    const first = await keepPlace(db, { name: 'Stall', first: false, at });
    const before = await db.places.toArray();
    const r = await keepPlace(db, { name: 'stall', first: false, lat: 10.002, lon: 20.002, at });
    expect((await db.places.toArray())[0]).toMatchObject({ visits: 2, lat: 10.002 });
    const bare = (ps: { updatedAt?: number }[]) => ps.map(({ updatedAt: _u, ...p }) => p); // Undo is a new edit for sync, so only its time moves on
    await r.undo.run(); expect(bare(await db.places.toArray())).toEqual(bare(before));
    expect(first.entryId).toBeGreaterThan(0);
  });
  it('removing a place entry takes back its visit, and Undo puts it back', async () => {
    const r = await keepPlace(db, { name: 'Stall', first: false, at }); await keepPlace(db, { name: 'Stall', first: false, at });
    const u = await removeEntry(db, r.entryId);
    expect((await db.places.toArray())[0].visits).toBe(1);
    await u.run(); expect((await db.places.toArray())[0].visits).toBe(2);
  });
  it('a span and its entry go together; removing the entry removes the span, and Undo brings both back', async () => {
    const r = await keepSpan(db, { name: 'Trip', from: '2026-09-17', to: '2026-09-21', family: 'curious' }, at);
    expect(await db.spans.count()).toBe(1);
    const u = await removeEntry(db, r.entryId); expect(await db.spans.count()).toBe(0);
    await u.run(); expect(await db.spans.count()).toBe(1); expect(await db.entries.count()).toBe(1);
    await expect(keepSpan(db, { name: 'x', from: '2026-11-10', to: '2026-11-06', family: 'warm' }, at)).rejects.toThrow('ends before it starts');
    expect(await db.spans.count()).toBe(1);
  });
  it('Undo of a span keep removes both', async () => {
    const r = await keepSpan(db, { name: 'Trip', from: '2026-09-17', to: '2026-09-21', family: 'curious' }, at);
    await r.undo.run(); expect(await db.spans.count()).toBe(0); expect(await db.entries.count()).toBe(0);
  });
});
describe('adding several photos reports what actually happened', () => {
  it('adds the good ones, counts the bad, and one Undo removes the added', async () => {
    const r = await addPhotos(db, [png(), pdf(), png()], at, img);
    expect(r.added).toBe(2); expect(r.failed).toBe(1); expect(await db.photos.count()).toBe(2);
    await r.undo.run(); expect(await db.photos.count()).toBe(0);
  });
  it('says it plainly', () => {
    expect(photosMessage(3, 1)).toBe('Added 3 photos. 1 file wasn’t a photo Logbook can read.');
    expect(photosMessage(1, 0)).toBe('Added the photo.');
    expect(photosMessage(0, 2)).toBe('Those files aren’t photos Logbook can read. Nothing was added.');
  });
});
describe('the backup is a zip, so it keeps working as photos pile up', () => {
  it('round-trips photos and voice notes through a zip', async () => {
    await addPhotos(db, [png()], at, img);
    await keepEntry(db, { kind: 'voice', text: '', data: { kind: 'voice', audio: new Blob(['sound'], { type: 'audio/webm' }), seconds: 1, type: 'audio/webm' }, at });
    const zip = await makeBackupZip(db);
    expect(new Uint8Array(await zip.slice(0, 2).arrayBuffer())).toEqual(new Uint8Array([0x50, 0x4b]));
    const other = openDb('r2a-z-' + n++); await other.open(); await restoreBackupFile(other, zip);
    const ph = (await other.photos.toArray())[0]; expect(await ph.blob.text()).toBe('jpeg-1600'); expect(ph.blob.type).toBe('image/jpeg');
    const v = (await other.entries.toArray()).find(e => e.kind === 'voice')!; expect(v.data?.kind === 'voice' && await v.data.audio.text()).toBe('sound');
  });
  it('an older .json backup still restores', async () => {
    await keepPlace(db, { name: 'Stall', first: false, at });
    const file = new Blob([JSON.stringify(await makeBackup(db))], { type: 'application/json' });
    const other = openDb('r2a-j-' + n++); await other.open(); await restoreBackupFile(other, file);
    expect(await other.places.count()).toBe(1);
  });
  it('a zip that is not a Logbook backup changes nothing', async () => {
    await keepPlace(db, { name: 'Stall', first: false, at });
    const { makeZip } = await import('../src/domain/zip');
    await expect(restoreBackupFile(db, makeZip([{ path: 'hello.txt', data: 'hi' }]))).rejects.toThrow('isn’t a Logbook backup');
    expect(await db.places.count()).toBe(1);
  });
});
