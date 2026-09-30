import { beforeEach, describe, expect, it } from 'vitest';
import { openDb, type LogbookDb } from '../src/db/db';
import { StorageFullError, confirmOverall, keepLine, keepMoment, removeEntry, removeFeelingFromEntry, removeMoment, setOverall } from '../src/db/actions';

let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('test-' + n++); await db.open(); });
const at = (s: string) => new Date(s);

describe('keeping a line', () => {
  it('saves the entry with tags, people and one merged moment', async () => {
    const r = await keepLine(db, { text: 'Walk with @r, :calm then :pooped #walk', marks: { first: true }, at: at('2026-09-29T23:24:00') }, {});
    const e = await db.entries.get(r.entryId);
    expect(e).toMatchObject({ day: '2026-09-29', tags: ['walk'], people: ['R'], marks: { first: true } });
    const ms = await db.moments.toArray();
    expect(ms).toHaveLength(1);
    expect(ms[0]).toMatchObject({ word: 'calm', second: 'low', about: 'then pooped', entryId: r.entryId, day: '2026-09-29' });
  });
  it('files a line kept at 00:30 under the day before', async () => {
    const r = await keepLine(db, { text: 'late', marks: {}, at: at('2026-09-30T00:30:00') }, {});
    expect((await db.entries.get(r.entryId))?.day).toBe('2026-09-29');
  });
  it('does not log a feeling twice within the hour', async () => {
    await keepLine(db, { text: ':calm', marks: {}, at: at('2026-09-29T22:00:00') }, {});
    const r = await keepLine(db, { text: 'again :calm', marks: {}, at: at('2026-09-29T22:40:00') }, {});
    expect(r.skipped).toEqual(['calm']);
    expect(await db.moments.count()).toBe(1);
  });
  it('an unknown :word stays text and makes no moment', async () => {
    await keepLine(db, { text: 'hmm :asdf', marks: {}, at: at('2026-09-29T22:00:00') }, {});
    expect(await db.moments.count()).toBe(0);
  });
  it('Undo removes exactly what was kept, and a second Undo does nothing', async () => {
    await keepLine(db, { text: 'earlier :content', marks: {}, at: at('2026-09-29T09:00:00') }, {});
    const r = await keepLine(db, { text: 'now :calm', marks: {}, at: at('2026-09-29T22:00:00') }, {});
    await r.undo.run();
    await r.undo.run();
    expect(await db.entries.count()).toBe(1);
    expect((await db.moments.toArray()).map(m => m.word)).toEqual(['content']);
  });
  it('reports storage full without saving half an entry', async () => {
    const real = db.moments.add.bind(db.moments);
    db.moments.add = (() => Promise.reject(Object.assign(new Error('full'), { name: 'QuotaExceededError' }))) as unknown as typeof db.moments.add;
    await expect(keepLine(db, { text: 'x :calm', marks: {}, at: at('2026-09-29T22:00:00') }, {})).rejects.toBeInstanceOf(StorageFullError);
    db.moments.add = real;
    expect(await db.entries.count()).toBe(0);
  });
});

describe('moments, the day overall and removing', () => {
  it('keeps a moment and undoes it', async () => {
    const r = await keepMoment(db, { word: 'nostalgic', family: 'wistful', strength: 3, at: at('2026-09-29T23:30:00') });
    expect(await db.moments.count()).toBe(1);
    await r.undo.run();
    expect(await db.moments.count()).toBe(0);
  });
  it('sets and confirms the day overall, with Undo restoring the previous one', async () => {
    await confirmOverall(db, '2026-09-29', { word: 'close', family: 'warm', strength: 4 });
    const u = await setOverall(db, '2026-09-29', { word: 'nostalgic', family: 'wistful', strength: 3 });
    expect((await db.days.get('2026-09-29'))?.overall).toMatchObject({ word: 'nostalgic', set: true });
    await u.run();
    expect((await db.days.get('2026-09-29'))?.overall).toMatchObject({ word: 'close', set: true });
  });
  it('removes one feeling from an entry and its moment, and Undo restores both', async () => {
    const r = await keepLine(db, { text: 'felt :calm then :pooped.', marks: {}, at: at('2026-09-29T22:00:00') }, {});
    const u = await removeFeelingFromEntry(db, r.entryId, 'calm');
    expect((await db.entries.get(r.entryId))?.text).toBe('felt then :pooped.');
    expect((await db.moments.toArray())[0]).toMatchObject({ word: 'pooped', family: 'low' });
    await u.run();
    expect((await db.entries.get(r.entryId))?.text).toBe('felt :calm then :pooped.');
    expect((await db.moments.toArray())[0]).toMatchObject({ word: 'calm', about: 'then pooped' });
  });
  it('removes a moment and a whole entry with Undo', async () => {
    const r = await keepLine(db, { text: 'x :calm', marks: {}, at: at('2026-09-29T22:00:00') }, {});
    const m = (await db.moments.toArray())[0];
    const u1 = await removeMoment(db, m.id!); expect(await db.moments.count()).toBe(0); await u1.run(); expect(await db.moments.count()).toBe(1);
    const u2 = await removeEntry(db, r.entryId); expect(await db.entries.count()).toBe(0); expect(await db.moments.count()).toBe(0);
    await u2.run(); expect(await db.entries.count()).toBe(1); expect(await db.moments.count()).toBe(1);
  });
});
