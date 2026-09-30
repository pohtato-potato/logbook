import { beforeEach, describe, expect, it } from 'vitest';
import { openDb, type LogbookDb } from '../src/db/db';
import { keepLine, setOverall } from '../src/db/actions';
import { dayToMarkdown } from '../src/domain/markdown';
import { crc32, makeZip } from '../src/domain/zip';
import { makeMarkdownZip } from '../src/db/exportMarkdown';
import { BackupError, makeBackup, restoreBackup } from '../src/db/backup';

let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('exp-' + n++); await db.open(); });

describe('Markdown', () => {
  it('writes a readable day with front matter, times, words and marks', () => {
    const md = dayToMarkdown('2026-09-29', { day: '2026-09-29', overall: { word: 'close', family: 'warm', strength: 4, set: true } },
      [{ id: 1, day: '2026-09-29', at: new Date('2026-09-29T23:24:00').getTime(), tz: 'Asia/Kolkata', kind: 'line', text: 'A "quoted" line: with --- dashes #walk :calm', marks: { first: true, priv: true }, tags: ['walk'], people: [], writtenAt: 0 }],
      [{ id: 1, day: '2026-09-29', at: new Date('2026-09-29T23:24:00').getTime(), word: 'calm', family: 'calm', strength: 3 }]);
    expect(md).toContain('---\ndate: 2026-09-29\n');
    expect(md).toContain('overall: "close (Warm, Sunset glow)"');
    expect(md).toContain('## 11:24 pm');
    expect(md).toContain('A "quoted" line: with --- dashes #walk calm');
    expect(md).toContain('Marks: first, private');
    expect(md).toContain('- 11:24 pm, calm (Calm, Clear morning)');
  });
});

describe('zip', () => {
  it('computes the standard CRC-32', () => expect(crc32(new TextEncoder().encode('123456789')).toString(16)).toBe('cbf43926'));
  it('writes a readable zip with the right entries', async () => {
    const bytes = new Uint8Array(await makeZip([{ path: 'a/b.md', data: 'hi' }]).arrayBuffer());
    expect([...bytes.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(new TextDecoder().decode(bytes)).toContain('a/b.md');
  });
  it('exports every day into its month folder', async () => {
    await keepLine(db, { text: 'first line', marks: {}, at: new Date('2026-09-29T10:00:00') }, {});
    const text = new TextDecoder().decode(new Uint8Array(await (await makeMarkdownZip(db)).arrayBuffer()));
    expect(text).toContain('2026/09/2026-09-29.md');
    expect(text).toContain('first line');
  });
});

describe('backup', () => {
  it('round-trips everything', async () => {
    await keepLine(db, { text: 'keep :calm', marks: { gift: true }, at: new Date('2026-09-29T10:00:00') }, {});
    await setOverall(db, '2026-09-29', { word: 'calm', family: 'calm', strength: 3 });
    const b = await makeBackup(db);
    const other = openDb('exp-restore-' + n++); await other.open();
    await restoreBackup(other, JSON.parse(JSON.stringify(b)));
    expect(await other.entries.count()).toBe(1);
    expect((await other.days.get('2026-09-29'))?.overall?.word).toBe('calm');
  });
  it('refuses a file that is not a Logbook backup, and writes nothing', async () => {
    await expect(restoreBackup(db, { hello: 1 })).rejects.toBeInstanceOf(BackupError);
    expect(await db.entries.count()).toBe(0);
  });
});
