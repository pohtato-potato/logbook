import { beforeEach, describe, expect, it } from 'vitest';
import { openDb, type LogbookDb } from '../src/db/db';
import { getSettings, keepLine, removeEntry, saveSettings, setOverall } from '../src/db/actions';
import { makeBackup, restoreBackup } from '../src/db/backup';
import { applyStarter } from '../src/db/starter';
import { importTimeline } from '../src/db/timeline';
import { parseTimeline, planImport } from '../src/sources/timeline';
import { makeSnapshot, mergeSnapshot } from '../src/sync/snapshot';
import { syncWithDrive } from '../src/sources/sync';
import { runSync } from '../src/ui/syncNow';
import { fakeDrive } from './fakeDrive';

let phone: LogbookDb, laptop: LogbookDb, n = 0;
beforeEach(async () => { phone = openDb('fx-p' + n); laptop = openDb('fx-l' + n++); await phone.open(); await laptop.open(); });
const nap = () => new Promise(r => setTimeout(r, 5));
async function send(a: LogbookDb, b: LogbookDb) {
  const { snap, blobs } = await makeSnapshot(a, 'dev-a', 'Phone');
  return mergeSnapshot(b, JSON.parse(JSON.stringify(snap)), async name => (blobs.get(name) ? await blobs.get(name)!() : null));
}
const at = (h: number) => new Date(`2026-10-01T${String(h).padStart(2, '0')}:00:00`);
const texts = async (d: LogbookDb) => (await d.entries.toArray()).map(e => e.text).sort();
describe('sync review fixes', () => {
  it('C1: restoring an old backup on one device neither deletes nor reverts newer writing on the other', async () => {
    await keepLine(phone, { text: 'june line', marks: {}, at: at(9) }, {}); await nap(); await send(phone, laptop);
    const backup = await makeBackup(laptop); await nap();
    await keepLine(phone, { text: 'july line', marks: {}, at: at(10) }, {}); await nap();
    const june = (await phone.entries.toArray()).find(e => e.text === 'june line')!; await phone.entries.update(june.id!, { text: 'june line, edited' }); await nap();
    await send(phone, laptop); await restoreBackup(laptop, backup); await nap();
    await send(laptop, phone); expect(await texts(phone)).toEqual(['july line', 'june line, edited']);
    await send(phone, laptop); expect(await texts(laptop)).toEqual(['july line', 'june line, edited']);
  });
  it('C2: a restore keeps this device’s own sync identity and lock, and reads everything again next sync', async () => {
    await saveSettings(phone, { sync: { device: 'dPHONE', cursors: { 'device-x.json': 't' } } });
    await saveSettings(laptop, { sync: { device: 'dLAPTOP', cursors: { 'device-y.json': 't' } }, lock: { credentialId: 'LAP', createdAt: 1 } });
    await restoreBackup(laptop, await makeBackup(phone));
    const s = await getSettings(laptop); expect(s.sync?.device).toBe('dLAPTOP'); expect(s.sync?.cursors).toEqual({}); expect(s.lock?.credentialId).toBe('LAP');
  });
  it('C3: grateful from one device and the overall from the other, same day, both survive', async () => {
    await phone.days.put({ day: '2026-10-01', grateful: 'my mother' }); await nap();
    await setOverall(laptop, '2026-10-01', { word: 'calm', family: 'calm', strength: 2 }); await nap();
    await send(phone, laptop); await send(laptop, phone);
    for (const d of [phone, laptop]) expect(await d.days.get('2026-10-01')).toMatchObject({ grateful: 'my mother', overall: { word: 'calm' } });
  });
  it('I1: an edit made after seeing a fast-clocked device’s edit still wins', async () => {
    const r = await keepLine(phone, { text: 'v1', marks: {}, at: at(9) }, {}); await nap(); await send(phone, laptop);
    const l = (await laptop.entries.toArray())[0];
    await laptop.entries.put({ ...l, text: 'laptop edit', updatedAt: Date.now() + 10 * 60_000, __fromSync: true } as never);
    await send(laptop, phone); expect((await phone.entries.get(r.entryId))!.text).toBe('laptop edit');
    await phone.entries.update(r.entryId, { text: 'phone fix' }); await nap();
    await send(phone, laptop); expect((await laptop.entries.toArray())[0].text).toBe('phone fix');
  });
  it('I2: undoing the first write of a day on one device doesn’t wipe the other device’s day', async () => {
    await phone.days.put({ day: '2026-10-01', grateful: 'g', headline: 'h' }); await nap();
    const u = await setOverall(laptop, '2026-10-01', { word: 'calm', family: 'calm', strength: 2 }); await u.run(); await nap();
    await send(laptop, phone); expect(await phone.days.get('2026-10-01')).toMatchObject({ grateful: 'g', headline: 'h' });
  });
  it('I3: a record copied by backup and edited since is still one record after the upgrade', async () => {
    const r = await keepLine(phone, { text: 'v1', marks: {}, at: at(9) }, {}); await nap();
    const e = (await phone.entries.get(r.entryId))!;
    await laptop.entries.add({ ...e, id: undefined, uid: undefined, text: 'v1 edited' } as never); await nap(); // a diverged copy, as the upgrade would see it
    await send(phone, laptop); expect((await laptop.entries.toArray()).length).toBe(1);
  });
  it('I4: two Timeline places with the same name stay two places', async () => {
    const tl = { semanticSegments: [
      { startTime: '2024-01-01T09:00:00+05:30', visit: { topCandidate: { semanticType: 'HOME', placeLocation: { latLng: '28.5°, 77.2°' } } } },
      { startTime: '2025-01-01T09:00:00+05:30', visit: { topCandidate: { semanticType: 'HOME', placeLocation: { latLng: '19.0°, 72.8°' } } } }] };
    await importTimeline(phone, planImport(parseTimeline(tl), [])); await nap(); await send(phone, laptop);
    expect((await laptop.places.toArray()).map(p => p.lat).sort()).toEqual([19, 28.5]);
  });
  it('I5: a record whose linked span was deleted doesn’t wait forever', async () => {
    const sid = await phone.spans.add({ name: 'Trip', from: '2026-10-01', to: '2026-10-03', family: 'bright' });
    const eid = await phone.entries.add({ day: '2026-10-01', at: 1, tz: 'UTC', kind: 'span', text: '', marks: {}, tags: [], people: [], writtenAt: 1, data: { kind: 'span', spanId: sid } }); await nap();
    await send(phone, laptop); await removeEntry(laptop, (await laptop.entries.toArray())[0].id!); await nap();
    await phone.entries.update(eid, { text: 'note' }); await nap();
    expect(await send(phone, laptop)).toMatchObject({ waiting: 0 });
  });
  it('I6: the photo of the day waits for its photo instead of being dropped', async () => {
    const pid = await phone.photos.add({ day: '2026-10-01', blob: new Blob(['i']), thumb: new Blob(['t']), addedAt: 7 });
    await phone.days.put({ day: '2026-10-01', potd: pid, grateful: 'g' }); await nap();
    const { snap, blobs } = await makeSnapshot(phone, 'a', 'Phone'), json = JSON.parse(JSON.stringify(snap));
    expect((await mergeSnapshot(laptop, json, async () => null)).waiting).toBeGreaterThan(0);
    await mergeSnapshot(laptop, json, async name => (blobs.get(name) ? await blobs.get(name)!() : null));
    expect((await laptop.days.get('2026-10-01'))!.potd).toBe((await laptop.photos.toArray())[0].id);
  });
  it('I7: while locked, automatic sync doesn’t run, and a tapped sync unlocks first', async () => {
    let asked = 0;
    expect(await runSync(false, { locked: true, unlock: async () => { asked++; return true; } })).toBeNull(); expect(asked).toBe(0);
    expect(await runSync(true, { locked: true, unlock: async () => { asked++; return false; } })).toBeNull(); expect(asked).toBe(1);
  });
  it('I8: with nothing new, a sync puts nothing up and the other device downloads nothing', async () => {
    const d = fakeDrive(), links = { lastfm: [], googleClientId: 'c' }; await saveSettings(phone, { links }); await saveSettings(laptop, { links });
    await keepLine(phone, { text: 'a', marks: {}, at: at(9) }, {}); await nap();
    await syncWithDrive(phone, d.g, { label: 'Phone' }); await syncWithDrive(laptop, d.g, { label: 'Laptop' }); await syncWithDrive(phone, d.g, { label: 'Phone' });
    d.log.length = 0; await syncWithDrive(phone, d.g, { label: 'Phone' }); await syncWithDrive(laptop, d.g, { label: 'Laptop' });
    expect(d.log.filter(l => l.startsWith('UPLOAD') || l.includes('?alt'))).toEqual([]);
  });
  it('I9: two sync folders made at once: every device uses the oldest', async () => {
    const d = fakeDrive(), links = { lastfm: [], googleClientId: 'c' }; await saveSettings(phone, { links }); await saveSettings(laptop, { links });
    const API = 'https://www.googleapis.com/drive/v3/files', F = 'application/vnd.google-apps.folder';
    const root = ((await d.g.call(API, { method: 'POST', body: JSON.stringify({ name: 'Logbook', mimeType: F }) })) as { id: string }).id;
    for (let i = 0; i < 2; i++) await d.g.call(API, { method: 'POST', body: JSON.stringify({ name: 'sync', mimeType: F, parents: [root] }) });
    await keepLine(phone, { text: 'a', marks: {}, at: at(9) }, {}); await nap();
    await syncWithDrive(phone, d.g, { label: 'Phone' }); d.reverse(); await syncWithDrive(laptop, d.g, { label: 'Laptop' });
    expect(await texts(laptop)).toEqual(['a']);
  });
  it('M9: loading the starter file again keeps the thread colours chosen since', async () => {
    await applyStarter(phone, { format: 'logbook-starter', version: 1, people: [{ id: 'r', initial: 'R', name: 'R' }], homes: [] }); await phone.people.update('r', { thread: 5 });
    await applyStarter(phone, { format: 'logbook-starter', version: 1, people: [{ id: 'r', initial: 'R', name: 'R' }], homes: [] });
    expect((await phone.people.get('r'))!.thread).toBe(5);
  });
});
