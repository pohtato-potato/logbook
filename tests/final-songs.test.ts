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

import { dayToMarkdown } from '../src/domain/markdown';
import { songsMarkdown } from '../src/db/exportMarkdown';
import card from './fixtures/postcard-v1.json';
import type { Postcard } from '../src/sources/shelf';
describe('I7, M20: the Markdown archive keeps everything', () => {
  it('a day keeps its song, the week’s headline and Health’s postcard', () => {
    const md = dayToMarkdown('2026-09-27', { day: '2026-09-27', headline: 'A week of rain', stamps: { song: { artist: 'A.R. Rahman', track: 'Kun Faya Kun', plays: 4, final: true, at: 0 } } }, [], [], undefined, undefined, card as Postcard);
    expect(md).toContain('song: "Kun Faya Kun, A.R. Rahman (4 plays)"'); expect(md).toContain('headline: "A week of rain"');
    expect(md).toContain('## Postcard from Health'); expect(md).toContain((card as Postcard).line);
  });
  it('songs of the week get their own file, newest first', () => {
    expect(songsMarkdown([{ week: '2025-01-06', artist: 'A', track: 'T', plays: 3 }, { week: '2025-01-13', artist: '', track: '', plays: 0 }])).toBe('# Songs of the week\n\n- Week of 13 January 2025: nothing played\n- Week of 6 January 2025: T, A (3 plays)\n');
  });
  it('a link whose address has brackets stays one link', () => {
    const md = dayToMarkdown('2026-09-27', undefined, [{ id: 1, day: '2026-09-27', at: 0, tz: 'UTC', kind: 'link', text: '', marks: {}, tags: [], people: [], writtenAt: 0, data: { kind: 'link', url: 'https://en.wikipedia.org/wiki/Up_(film)', title: 'Up' } }], []);
    expect(md).toContain('[Up](<https://en.wikipedia.org/wiki/Up_(film)>)');
  });
});

import { readShare, shareToEntry } from '../src/share';
describe('I14, I15, M8: sharing in keeps every word', () => {
  const yt = { title: '', text: 'Lofi beats to study to', url: 'https://youtu.be/abc' };
  it('a link with text but no title keeps the text as its title, and the owner’s line', () => {
    expect(shareToEntry(yt, 'link', 'for Sundays')).toEqual({ kind: 'link', text: 'for Sundays', data: { kind: 'link', url: 'https://youtu.be/abc', title: 'Lofi beats to study to' } });
  });
  it('a quote keeps the owner’s line as where it came from', () => {
    expect(shareToEntry({ title: '', text: 'Be kind.', url: '' }, 'quote', 'Mum read this out at dinner')).toEqual({ kind: 'quote', text: 'Be kind.', data: { kind: 'quote', who: 'A book or film', where: 'Mum read this out at dinner' } });
  });
  it('watched goes to Media now, carrying the title, the owner’s line and the address', () => {
    expect(shareToEntry({ title: 'Up', text: '', url: '' }, 'watched', 'with Ma')).toEqual({ toMedia: { title: 'Up', text: 'with Ma', url: '' } });
  });
  it('an address Logbook won’t open is kept as words, not lost', () => {
    expect(shareToEntry({ title: '', text: '', url: 'javascript:alert(1)' }, 'link', '')).toEqual({ kind: 'link', text: '', data: { kind: 'link', url: '', title: 'javascript:alert(1)' } });
  });
  it('trailing punctuation is not part of an address found in text', () => {
    expect(readShare('?text=' + encodeURIComponent('See (https://example.com/a).'))!.url).toBe('https://example.com/a');
  });
});
