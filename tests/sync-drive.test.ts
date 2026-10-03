import { beforeEach, describe, expect, it } from 'vitest';
import { openDb, type LogbookDb } from '../src/db/db';
import { getSettings, keepLine, saveSettings } from '../src/db/actions';
import { syncWithDrive } from '../src/sources/sync';
import { fakeDrive } from './fakeDrive';

let phone: LogbookDb, laptop: LogbookDb, n = 0;
const links = { lastfm: [], googleClientId: 'cid' };
beforeEach(async () => { phone = openDb('sp-' + n); laptop = openDb('sl-' + n++); await phone.open(); await laptop.open(); await saveSettings(phone, { links }); await saveSettings(laptop, { links }); });
const nap = () => new Promise(r => setTimeout(r, 5));
const at = new Date('2026-10-01T10:00:00');
describe('sync through Drive', () => {
  it('the phone’s entries and photos reach the laptop, and the laptop’s come back', async () => {
    const d = fakeDrive();
    await keepLine(phone, { text: 'tea :calm', marks: {}, at }, {}); await phone.photos.add({ day: '2026-10-01', blob: new Blob(['img'], { type: 'image/jpeg' }), thumb: new Blob(['t'], { type: 'image/jpeg' }), addedAt: 3 }); await nap();
    await syncWithDrive(phone, d.g, { label: 'Phone' });
    expect([...d.files.values()].map(f => f.name).sort()).toEqual(expect.arrayContaining(['Logbook', 'sync', expect.stringMatching(/^device-/), expect.stringMatching(/^photo-photos-/), expect.stringMatching(/^thumb-photos-/)]));
    const r = await syncWithDrive(laptop, d.g, { label: 'Laptop' });
    expect(r.merged.added).toBe(3); expect(r.devices).toEqual(['Phone']); expect(await (await laptop.photos.toArray())[0].blob.text()).toBe('img');
    await keepLine(laptop, { text: 'evening walk', marks: {}, at: new Date('2026-10-01T19:00:00') }, {}); await nap();
    await syncWithDrive(laptop, d.g, { label: 'Laptop' }); await syncWithDrive(phone, d.g, { label: 'Phone' });
    expect((await phone.entries.toArray()).map(e => e.text).sort()).toEqual(['evening walk', 'tea :calm']);
    expect((await getSettings(phone)).sync?.last).toBeGreaterThan(0);
  });
  it('a sync with nothing new reads nothing new and uploads no files again', async () => {
    const d = fakeDrive();
    await phone.photos.add({ day: '2026-10-01', blob: new Blob(['i']), thumb: new Blob(['t']), addedAt: 3 }); await nap();
    await syncWithDrive(phone, d.g, { label: 'Phone' }); await syncWithDrive(laptop, d.g, { label: 'Laptop' });
    d.log.length = 0; await syncWithDrive(laptop, d.g, { label: 'Laptop' });
    expect(d.log.filter(l => l.includes('?alt'))).toEqual([]); expect(d.log.filter(l => l.startsWith('UPLOAD photo') || l.startsWith('UPLOAD thumb'))).toEqual([]);
  });
  it('switched off, or not set up, it says so and touches nothing', async () => {
    const d = fakeDrive();
    await saveSettings(phone, { sources: { weather: true, places: true, sync: false } });
    await expect(syncWithDrive(phone, d.g, { label: 'Phone' })).rejects.toThrow('Sync between devices is switched off in Settings.');
    expect(d.files.size).toBe(0);
  });
});
