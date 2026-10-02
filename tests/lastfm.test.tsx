import { beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import recent from './fixtures/lastfm-recent.json';
import weekly from './fixtures/lastfm-weekly.json';
import { parseRecent, parseWeekly, recentUrl, weeklyUrl } from '../src/sources/lastfm';
import { ensureSong, ensureWeeks } from '../src/db/songs';
import { openDb, type LogbookDb } from '../src/db/db';
import { saveSettings } from '../src/db/actions';
import { stampList } from '../src/domain/stamps';
import { ShelfView } from '../src/screens/Shelves';

let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('lf-' + n++); await db.open(); });
const now = new Date('2026-09-29T15:00:00');
const links = { lastfm: ['old', 'new'], lastfmKey: 'KEY' };
describe('Last.fm', () => {
  it('asks only for the day’s plays, by username, with the key', () => {
    const u = new URL(recentUrl('old', 'KEY', 100, 200));
    expect(u.host).toBe('ws.audioscrobbler.com'); expect(Object.fromEntries(u.searchParams)).toMatchObject({ method: 'user.getrecenttracks', user: 'old', api_key: 'KEY', from: '100', to: '200', format: 'json' });
    expect(new URL(weeklyUrl('old', 'KEY', 1, 2)).searchParams.get('method')).toBe('user.getweeklytrackchart');
  });
  it('counts plays, skipping what is playing right now, and reads weekly charts', () => {
    expect(parseRecent(recent)).toEqual([{ artist: 'A.R. Rahman', track: 'Kun Faya Kun' }, { artist: 'A.R. Rahman', track: 'Kun Faya Kun' }, { artist: 'Prateek Kuhad', track: 'cold/mess' }]);
    expect(parseWeekly(weekly)[0]).toEqual({ artist: 'A.R. Rahman', track: 'Kun Faya Kun', plays: 9 }); expect(parseRecent('<html>')).toEqual([]);
  });
  it('the day’s song combines both accounts and becomes the Playing stamp', async () => {
    await saveSettings(db, { links }); const users: string[] = [];
    expect(await ensureSong(db, '2026-09-28', now, async u => { users.push(new URL(u).searchParams.get('user')!); return recent; })).toBe('ok');
    expect(users).toEqual(['old', 'new']);
    const song = (await db.days.get('2026-09-28'))?.stamps?.song; expect(song).toMatchObject({ artist: 'A.R. Rahman', track: 'Kun Faya Kun', plays: 4 });
    expect(Object.fromEntries(stampList({ day: '2026-09-28', today: '2026-09-29', stamps: { song: song! }, pos: null, homes: [], people: [], spans: [] }))['Playing']).toBe('Kun Faya Kun, A.R. Rahman (4 plays)');
  });
  it('not set up, or switched off: nothing is asked', async () => {
    let asked = 0; const get = async () => { asked++; return recent; };
    expect(await ensureSong(db, '2026-09-28', now, get)).toBe('not-set-up');
    await saveSettings(db, { links, sources: { weather: true, places: true, songs: false } }); expect(await ensureSong(db, '2026-09-28', now, get)).toBe('off'); expect(asked).toBe(0);
  });
  it('songs of the week: finished weeks are kept, the shelf lists them newest first', async () => {
    await saveSettings(db, { links }); let asked = 0;
    await ensureWeeks(db, now, async () => { asked++; return weekly; }, 3); const first = asked;
    await ensureWeeks(db, now, async () => { asked++; return weekly; }, 3); expect(asked).toBe(first);
    const songs = await db.songs.orderBy('week').reverse().toArray(); expect(songs.length).toBe(3); expect(songs[0]).toMatchObject({ track: 'Kun Faya Kun', plays: 18 });
    const html = renderToStaticMarkup(<ShelfView shelf="songs" entries={[]} lookup={{ places: new Map(), spans: new Map(), people: new Map() }} thumbs={new Map()} places={[]} homes={[]} people={[]} spans={[]} songs={songs} today="2026-09-29" />);
    expect(html).toContain('Kun Faya Kun'); expect(html).toContain('18 plays');
  });
});
