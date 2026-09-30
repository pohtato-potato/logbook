import { beforeEach, describe, expect, it } from 'vitest';
import { tokenize } from '../src/domain/line';
import { timeLabelIn } from '../src/domain/day';
import { dayToMarkdown } from '../src/domain/markdown';
import { makeZip } from '../src/domain/zip';
import { openDb, type LogbookDb } from '../src/db/db';
import { keepLine, removeFeelingFromEntry } from '../src/db/actions';
import { BackupError, makeBackup, restoreBackup } from '../src/db/backup';

let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('le-' + n++); await db.open(); });

describe('loose ends', () => {
  it('# and @ only count at the start of a word', () => {
    expect(tokenize('mail a@gmail.com about C# and issue#12').length).toBe(0);
    expect(tokenize('with @Alex #walk').map(t => t.kind + ':' + t.value)).toEqual(['person:A', 'tag:walk']);
  });
  it('shows times where they were written', () => {
    const at = Date.UTC(2026, 8, 29, 17, 30); // 23:00 in India, 18:30 in London
    expect(timeLabelIn(at, 'Asia/Kolkata')).toBe('11:00 pm');
    expect(timeLabelIn(at, 'Europe/London')).toBe('6:30 pm');
    expect(timeLabelIn(Date.UTC(2026, 8, 29, 0, 5), 'UTC')).toBe('12:05 am');
  });
  it('export writes feelings as words and lists marks in the front matter', () => {
    const md = dayToMarkdown('2026-09-29', undefined, [{ id: 1, day: '2026-09-29', at: 0, tz: 'UTC', kind: 'line', text: 'felt :at-ease today', marks: { first: true }, tags: [], people: [], writtenAt: 0 }], []);
    expect(md).toContain('felt at ease today');
    expect(md).toMatch(/marks: \["first"\]/);
  });
  it('zip entries carry a real date', async () => {
    const b = new Uint8Array(await makeZip([{ path: 'a.md', data: 'x' }], new Date(2026, 8, 29, 12, 0)).arrayBuffer());
    const dv = new DataView(b.buffer); expect(dv.getUint16(12, true)).toBe(((2026 - 1980) << 9) | (9 << 5) | 29);
  });
  it('removing one of three feelings keeps the others’ own families', async () => {
    const r = await keepLine(db, { text: ':calm :lonely :excited', marks: {}, at: new Date('2026-09-29T22:00:00') }, {});
    await removeFeelingFromEntry(db, r.entryId, 'calm');
    expect((await db.moments.toArray())[0]).toMatchObject({ word: 'lonely', family: 'low', second: 'bright', about: 'then excited' });
  });
  it('undoing a kept line removes a tag it created', async () => {
    const r = await keepLine(db, { text: 'new #brandnew', marks: {}, at: new Date() }, {});
    await r.undo.run();
    expect(await db.tags.get('brandnew')).toBeUndefined();
  });
  it('refuses a backup with missing tables, and an unreadable one, with plain messages', async () => {
    const b = await makeBackup(db); delete (b.tables as Record<string, unknown>).moments;
    await expect(restoreBackup(db, b)).rejects.toThrow('isn’t complete');
    await expect(restoreBackup(db, 'not json at all')).rejects.toBeInstanceOf(BackupError);
  });
});
