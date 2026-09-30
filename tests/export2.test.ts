import { beforeEach, describe, expect, it } from 'vitest';
import { openDb, type LogbookDb } from '../src/db/db';
import { keepEntry } from '../src/db/actions';
import { addPhoto } from '../src/db/photos';
import { makeMarkdownZip } from '../src/db/exportMarkdown';
import { makeBackup, restoreBackup } from '../src/db/backup';

let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('ex2-' + n++); await db.open(); });
const at = new Date('2026-09-29T20:00:00');
const img = async (_b: Blob, max: number) => new Blob([`jpeg-${max}`], { type: 'image/jpeg' });

describe('export with files', () => {
  it('puts photos and voice notes in folders and links them from the day', async () => {
    await addPhoto(db, new Blob(['x'], { type: 'image/png' }), at, img);
    const v = await keepEntry(db, { kind: 'voice', text: '', data: { kind: 'voice', audio: new Blob(['sound'], { type: 'audio/webm' }), seconds: 42, type: 'audio/webm' }, at });
    const text = new TextDecoder().decode(new Uint8Array(await (await makeMarkdownZip(db)).arrayBuffer()));
    expect(text).toContain('photos/2026/09/2026-09-29-1.jpg');
    expect(text).toContain('![Photo](../../photos/2026/09/2026-09-29-1.jpg) (photo of the day)');
    expect(text).toContain(`[Voice note, 0:42](../../audio/2026/09/2026-09-29-${v.entryId}.webm)`);
    expect(text).toContain('jpeg-1600'); expect(text).toContain('sound');
  });
  it('an iPhone recording is saved as .m4a', async () => {
    const v = await keepEntry(db, { kind: 'voice', text: '', data: { kind: 'voice', audio: new Blob(['s'], { type: 'audio/mp4' }), seconds: 3, type: 'audio/mp4' }, at });
    const text = new TextDecoder().decode(new Uint8Array(await (await makeMarkdownZip(db)).arrayBuffer()));
    expect(text).toContain(`audio/2026/09/2026-09-29-${v.entryId}.m4a`);
  });
});
describe('backup with files', () => {
  it('round-trips photos and voice notes byte for byte', async () => {
    await addPhoto(db, new Blob(['x'], { type: 'image/png' }), at, img);
    await keepEntry(db, { kind: 'voice', text: '', data: { kind: 'voice', audio: new Blob(['sound'], { type: 'audio/webm' }), seconds: 1, type: 'audio/webm' }, at });
    const json = JSON.parse(JSON.stringify(await makeBackup(db)));
    const other = openDb('ex2-r-' + n++); await other.open(); await restoreBackup(other, json);
    const ph = (await other.photos.toArray())[0];
    expect(await ph.blob.text()).toBe('jpeg-1600'); expect(ph.blob.type).toBe('image/jpeg');
    const v = (await other.entries.toArray()).find(e => e.kind === 'voice')!;
    expect(v.data?.kind === 'voice' && await v.data.audio.text()).toBe('sound');
  });
  it('a Stage 1 backup without a photos table still restores', async () => {
    const b = await makeBackup(db); delete (b.tables as Record<string, unknown>).photos;
    await expect(restoreBackup(db, JSON.parse(JSON.stringify(b)))).resolves.toBeUndefined();
  });
  it('stamps travel into the front matter in words', async () => {
    await db.days.put({ day: '2026-09-29', stamps: { weather: { code: 2, max: 31.4, min: 24.1, rain: 1.8, final: true, at: 0 }, air: { aqi: 212, category: 'Poor', lead: 'PM2.5', final: true, at: 0 } } });
    const text = new TextDecoder().decode(new Uint8Array(await (await makeMarkdownZip(db)).arrayBuffer()));
    expect(text).toContain('weather: "Partly cloudy, 31° by day, 24° at night, 2 mm rain"'); expect(text).toContain('air: "212, poor (India scale)"');
  });
});

