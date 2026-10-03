import { beforeEach, describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { openDb, type LogbookDb } from '../src/db/db';
import { keepLine, removeEntry, setOverall } from '../src/db/actions';
import { REMOTE, uidFor } from '../src/db/syncMeta';

let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('sm-' + n++); await db.open(); });
const nap = () => new Promise(r => setTimeout(r, 5));
describe('sync bookkeeping', () => {
  it('every new record gets a stable uid and the time it was written', async () => {
    const r = await keepLine(db, { text: 'tea :calm', marks: {}, at: new Date('2026-10-01T10:00:00') }, {});
    const e = (await db.entries.get(r.entryId))!, m = (await db.moments.toArray())[0];
    expect(e.uid).toBe(uidFor('entries', e)); expect(e.updatedAt).toBeGreaterThan(0);
    expect(m.uid).toMatch(/^moments-/); expect(m.updatedAt).toBeGreaterThan(0);
  });
  it('the same record made on two devices gets the same uid, even after one copy was edited', () => {
    const e = { day: '2026-10-01', at: 1, writtenAt: 1, kind: 'line', text: 'tea' };
    expect(uidFor('entries', e)).toBe(uidFor('entries', { ...e, text: 'green tea' })); expect(uidFor('entries', e)).not.toBe(uidFor('entries', { ...e, writtenAt: 2 }));
    expect(uidFor('places', { name: 'Blue Tokai' })).toBe(uidFor('places', { name: 'blue tokai' })); expect(uidFor('places', { name: 'Home', lat: 28.5, lon: 77.2 })).not.toBe(uidFor('places', { name: 'Home', lat: 19, lon: 72.8 }));
    expect(uidFor('days', { day: '2026-10-01' })).toBe('2026-10-01');
  });
  it('an edit moves updatedAt on; each of the day’s own fields gets its own time, stamps don’t', async () => {
    await db.days.put({ day: '2026-10-01', stamps: { pending: true } }); const a = (await db.days.get('2026-10-01'))!;
    expect(a.fieldAt).toBeUndefined(); await nap();
    await db.days.update('2026-10-01', { stamps: { pending: false } }); const b = (await db.days.get('2026-10-01'))!;
    expect(b.updatedAt).toBeGreaterThan(a.updatedAt!); expect(b.fieldAt).toBeUndefined();
    await setOverall(db, '2026-10-01', { word: 'calm', family: 'calm', strength: 2 }); const c = (await db.days.get('2026-10-01'))!; expect(c.fieldAt?.overall).toBeGreaterThan(0); expect(c.fieldAt?.grateful).toBeUndefined();
  });
  it('a delete leaves a tombstone; putting it back (Undo) clears it', async () => {
    const r = await keepLine(db, { text: 'tea', marks: {}, at: new Date('2026-10-01T10:00:00') }, {});
    const uid = (await db.entries.get(r.entryId))!.uid!;
    const undo = await removeEntry(db, r.entryId); await nap();
    expect(await db.tombstones.get(`entries:${uid}`)).toMatchObject({ table: 'entries', uid });
    await undo.run(); await nap(); expect(await db.tombstones.get(`entries:${uid}`)).toBeUndefined();
  });
  it('a write from another device keeps its own times and leaves no tombstone trail', async () => {
    await db.entries.add({ day: '2026-10-01', at: 1, tz: 'UTC', kind: 'line', text: 'x', marks: {}, tags: [], people: [], writtenAt: 1, uid: 'u1', updatedAt: 42, [REMOTE]: true } as never);
    const e = (await db.entries.where('uid').equals('u1').first())!; expect(e.updatedAt).toBe(42); expect(REMOTE in e).toBe(false);
  });
  it('records from before sync get uids and times when the database upgrades', async () => {
    const name = 'sm-old-' + n++, old = new Dexie(name);
    old.version(3).stores({ entries: '++id, day, at, kind, *tags, *people', moments: '++id, day, at, entryId, family', days: 'day', people: 'id', words: 'word', settings: 'id', photos: '++id, day', places: '++id, name', spans: '++id, from, to', postcards: 'id, app, day', tags: 'name', songs: 'week' });
    await old.open(); await old.table('entries').add({ day: '2026-09-01', at: 5, tz: 'UTC', kind: 'line', text: 'old', marks: {}, tags: [], people: [], writtenAt: 5 }); old.close();
    const up = openDb(name); await up.open(); const e = (await up.entries.toArray())[0];
    expect(e.uid).toBe(uidFor('entries', e)); expect(e.updatedAt).toBe(5);
  });
});
