import { beforeEach, describe, expect, it } from 'vitest';
import { openDb, type LogbookDb } from '../src/db/db';
import { keepLine, keepPlace, removeEntry, setOverall } from '../src/db/actions';
import { makeSnapshot, mergeSnapshot } from '../src/sync/snapshot';

let phone: LogbookDb, laptop: LogbookDb, n = 0;
beforeEach(async () => { phone = openDb('ph-' + n); laptop = openDb('lp-' + n++); await phone.open(); await laptop.open(); });
const nap = () => new Promise(r => setTimeout(r, 5));
/* One sync from a to b: a's snapshot (and its files) merged into b. */
async function send(a: LogbookDb, b: LogbookDb) {
  const { snap, blobs } = await makeSnapshot(a, 'dev-a', 'Phone');
  const json = JSON.parse(JSON.stringify(snap)); // it travels as text
  return mergeSnapshot(b, json, async name => (blobs.get(name) ? await blobs.get(name)!() : null));
}
const at = new Date('2026-10-01T10:00:00');
describe('sync: snapshot and merge', () => {
  it('a line and its feeling written on the phone arrive on the laptop, linked', async () => {
    await keepLine(phone, { text: 'tea with @R :calm', marks: { first: true }, at }, {}); await nap();
    expect(await send(phone, laptop)).toMatchObject({ added: 2 });
    const e = (await laptop.entries.toArray())[0], m = (await laptop.moments.toArray())[0];
    expect(e).toMatchObject({ text: 'tea with @R :calm', marks: { first: true } }); expect(m.entryId).toBe(e.id);
    expect(await send(phone, laptop)).toMatchObject({ added: 0, changed: 0 }); // again: nothing new
  });
  it('an edit on the laptop, newer, wins on the phone; an older one doesn’t', async () => {
    const r = await keepLine(phone, { text: 'tea', marks: {}, at }, {}); await nap(); await send(phone, laptop);
    const lid = (await laptop.entries.toArray())[0].id!; await nap();
    await laptop.entries.update(lid, { text: 'green tea' }); await nap();
    expect(await send(laptop, phone)).toMatchObject({ changed: 1 }); expect((await phone.entries.get(r.entryId))!.text).toBe('green tea');
    await phone.entries.update(r.entryId, { text: 'jasmine tea' }); await nap();
    await send(laptop, phone); expect((await phone.entries.get(r.entryId))!.text).toBe('jasmine tea');
  });
  it('a delete travels, and an edit made after the delete survives it', async () => {
    const r = await keepLine(phone, { text: 'tea :calm', marks: {}, at }, {}); await nap(); await send(phone, laptop);
    await removeEntry(phone, r.entryId); await nap();
    expect(await send(phone, laptop)).toMatchObject({ removed: 2 }); expect(await laptop.entries.count()).toBe(0); expect(await laptop.moments.count()).toBe(0);
    expect(await send(laptop, phone)).toMatchObject({ added: 0 }); // the tombstone keeps it from coming back
    const r2 = await keepLine(phone, { text: 'coffee', marks: {}, at: new Date('2026-10-01T11:00:00') }, {}); await nap(); await send(phone, laptop);
    await removeEntry(phone, r2.entryId); await nap();
    const lid = (await laptop.entries.toArray())[0].id!; await laptop.entries.update(lid, { text: 'coffee, edited later' }); await nap(); // edited after the delete
    await send(phone, laptop); expect((await laptop.entries.get(lid))!.text).toBe('coffee, edited later');
  });
  it('places travel with their visits, and two devices naming the same place at the same spot share one', async () => {
    await keepPlace(phone, { name: 'Blue Tokai', first: true, lat: 28.5, lon: 77.2, at }); await nap();
    await keepPlace(laptop, { name: 'blue tokai', first: false, lat: 28.5001, lon: 77.2001, at: new Date('2026-10-02T10:00:00') }); await nap();
    await send(phone, laptop); expect(await laptop.places.count()).toBe(1); expect((await laptop.places.toArray())[0].visits).toBe(2);
    const e = (await laptop.entries.toArray()).find(x => x.day === '2026-10-01')!; expect(e.data).toMatchObject({ kind: 'place', placeId: (await laptop.places.toArray())[0].id });
  });
  it('a day: the owner’s overall from one device and the weather from the other both survive', async () => {
    await setOverall(phone, '2026-10-01', { word: 'calm', family: 'calm', strength: 2 }); await nap();
    await laptop.days.put({ day: '2026-10-01', stamps: { weather: { code: 1, max: 30, min: 20, rain: 0, final: false, at: 1 } } }); await nap();
    await send(phone, laptop); const d = (await laptop.days.get('2026-10-01'))!;
    expect(d.overall?.word).toBe('calm'); expect(d.stamps?.weather?.max).toBe(30);
  });
  it('photos, keepsakes, the photo of the day and voice notes bring their files', async () => {
    const blob = new Blob(['img'], { type: 'image/jpeg' }), thumb = new Blob(['t'], { type: 'image/jpeg' });
    const pid = await phone.photos.add({ day: '2026-10-01', blob, thumb, addedAt: 7 });
    await phone.days.put({ day: '2026-10-01', potd: pid });
    await phone.entries.add({ day: '2026-10-01', at: 8, tz: 'UTC', kind: 'keep', text: 'ticket', marks: {}, tags: [], people: [], writtenAt: 8, data: { kind: 'keep', photoId: pid } });
    await phone.entries.add({ day: '2026-10-01', at: 9, tz: 'UTC', kind: 'voice', text: '', marks: {}, tags: [], people: [], writtenAt: 9, data: { kind: 'voice', audio: new Blob(['ogg'], { type: 'audio/webm' }), seconds: 3, type: 'audio/webm' } });
    await nap(); await send(phone, laptop);
    const p = (await laptop.photos.toArray())[0]; expect(await p.blob.text()).toBe('img'); expect(await p.thumb.text()).toBe('t');
    expect((await laptop.days.get('2026-10-01'))!.potd).toBe(p.id);
    const es = await laptop.entries.toArray();
    expect(es.find(e => e.kind === 'keep')!.data).toMatchObject({ photoId: p.id });
    const v = es.find(e => e.kind === 'voice')!.data as { audio: Blob }; expect(await v.audio.text()).toBe('ogg');
  });
  it('a record whose file can’t be fetched yet is left for the next sync, not half-kept', async () => {
    await phone.photos.add({ day: '2026-10-01', blob: new Blob(['i']), thumb: new Blob(['t']), addedAt: 7 }); await nap();
    const { snap } = await makeSnapshot(phone, 'dev-a', 'Phone');
    expect(await mergeSnapshot(laptop, JSON.parse(JSON.stringify(snap)), async () => null)).toMatchObject({ waiting: 1 }); expect(await laptop.photos.count()).toBe(0);
  });
  it('settings never travel (the lock belongs to the device)', async () => {
    const { snap } = await makeSnapshot(phone, 'dev-a', 'Phone'); expect(Object.keys(snap.records)).not.toContain('settings');
  });
});
