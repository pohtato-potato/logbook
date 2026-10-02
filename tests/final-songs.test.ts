import { beforeEach, describe, expect, it } from 'vitest';
import recent from './fixtures/lastfm-recent.json';
import weekly from './fixtures/lastfm-weekly.json';
import { ensureSong, ensureWeeks } from '../src/db/songs';
import { openDb, type LogbookDb } from '../src/db/db';
import { getSettings, saveSettings } from '../src/db/actions';
import { sourcesOf } from '../src/db/stamps';
import { OfflineError } from '../src/sources/http';

let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('fs-' + n++); await db.open(); });
const now = new Date('2026-09-29T15:00:00'), links = { lastfm: ['old', 'new'], lastfmKey: 'KEY' };
const off = async () => saveSettings(db, { sources: { ...sourcesOf(await getSettings(db)), songs: false } });
describe('I5, I6: Last.fm', () => {
  it('one unreadable account does not blank the other', async () => {
    await saveSettings(db, { links });
    expect(await ensureSong(db, '2026-09-28', now, async u => { if (u.includes('user=old')) throw new OfflineError(); return recent; })).toBe('ok');
    expect((await db.days.get('2026-09-28'))?.stamps?.song).toMatchObject({ track: 'Kun Faya Kun', plays: 2, final: false });
    expect(await ensureWeeks(db, now, async u => { if (u.includes('user=old')) throw new OfflineError(); return weekly; }, 1)).toBe('ok');
    expect(await db.songs.count()).toBe(1);
  });
  it('switching Songs off mid-flight stops asking and keeps nothing', async () => {
    await saveSettings(db, { links }); let asked = 0;
    expect(await ensureSong(db, '2026-09-28', now, async () => { asked++; await off(); return recent; })).toBe('off');
    expect((await db.days.get('2026-09-28'))?.stamps?.song).toBeUndefined();
    await saveSettings(db, { sources: { ...sourcesOf(await getSettings(db)), songs: true } }); asked = 0;
    expect(await ensureWeeks(db, now, async () => { asked++; await off(); return weekly; }, 6)).toBe('off');
    expect(asked).toBeLessThanOrEqual(2); expect(await db.songs.count()).toBe(0);
  });
});

import { makeBackup, restoreBackup } from '../src/db/backup';
import { applyStarter } from '../src/db/starter';
import { StorageFullError } from '../src/db/actions';
describe('I8, I12: backups keep songs; a full phone says so', () => {
  it('songs of the week survive a backup and restore, and older backups without them still restore', async () => {
    await db.songs.put({ week: '2025-01-06', artist: 'A', track: 'T', plays: 3 });
    const b = await makeBackup(db); await db.songs.clear(); await restoreBackup(db, b);
    expect(await db.songs.get('2025-01-06')).toMatchObject({ track: 'T' });
    const old = JSON.parse(JSON.stringify(b)); delete old.tables.songs; await expect(restoreBackup(db, old)).resolves.toBeUndefined();
  });
  it('restoring or loading the starter file on a full phone is told as a full phone', async () => {
    const full = () => { throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }); };
    const b = await makeBackup(db); (db as unknown as { transaction: unknown }).transaction = full;
    await expect(restoreBackup(db, b)).rejects.toBeInstanceOf(StorageFullError);
    await expect(applyStarter(db, { format: 'logbook-starter', version: 1, people: [], homes: [] } as never)).rejects.toBeInstanceOf(StorageFullError);
  });
});
