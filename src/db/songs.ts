import type { LogbookDb } from './db';
import { getSettings } from './actions';
import { sourcesOf } from './stamps';
import type { SongStamp } from './types';
import { addDays, dayKey, parseDay, weekStartOf } from '../domain/day';
import { parseRecent, parseWeekly, recentUrl, weeklyUrl } from '../sources/lastfm';
import type { FetchJson } from '../sources/http';

const STALE = 3 * 3600_000;
/* Local midnight of a day as Unix seconds (the 4 am rule is kept: a day runs 4 am to 4 am). */
const unix = (day: string) => Math.floor((parseDay(day).getTime() - 8 * 3600_000) / 1000);
async function ready(db: LogbookDb) { const s = await getSettings(db), l = s.links; if (!l?.lastfmKey || !l.lastfm.length) return 'not-set-up' as const; if (!sourcesOf(s).songs) return 'off' as const; return { key: l.lastfmKey, users: l.lastfm }; }
const top = (plays: { artist: string; track: string }[]) => { const n = new Map<string, number>(); plays.forEach(p => n.set(`${p.artist}\u0000${p.track}`, (n.get(`${p.artist}\u0000${p.track}`) ?? 0) + 1)); const best = [...n].sort((a, b) => b[1] - a[1])[0]; return best ? { artist: best[0].split('\u0000')[0], track: best[0].split('\u0000')[1], plays: best[1] } : null; };
/* The day's most-played track across all the owner's accounts, cached like the weather (final two days later). */
export async function ensureSong(db: LogbookDb, day: string, now: Date, get: FetchJson): Promise<'ok' | 'off' | 'not-set-up' | 'offline'> {
  const r = await ready(db); if (typeof r === 'string') return r;
  const today = dayKey(now), cur = (await db.days.get(day))?.stamps?.song;
  if (day > today || (cur && (cur.final || now.getTime() - cur.at < STALE))) return 'ok';
  try {
    const plays = (await Promise.all(r.users.map(u => get(recentUrl(u, r.key, unix(day), unix(addDays(day, 1)) - 1))))).flatMap(parseRecent);
    const best = top(plays), song: SongStamp = { artist: best?.artist ?? '', track: best?.track ?? '', plays: best?.plays ?? 0, final: day <= addDays(today, -2), at: now.getTime() };
    await db.transaction('rw', db.days, async () => { const row = (await db.days.get(day)) ?? { day }; await db.days.put({ ...row, stamps: { ...row.stamps, song } }); });
    return 'ok';
  } catch { return 'offline'; }
}
/* Songs of the week for the last few finished weeks; a finished week is asked once and kept. */
export async function ensureWeeks(db: LogbookDb, now: Date, get: FetchJson, weeks = 12): Promise<'ok' | 'off' | 'not-set-up' | 'offline'> {
  const r = await ready(db); if (typeof r === 'string') return r;
  const thisWeek = weekStartOf(dayKey(now));
  try {
    for (let k = 1; k <= weeks; k++) {
      const week = addDays(thisWeek, -7 * k); if (await db.songs.get(week)) continue;
      const charts = (await Promise.all(r.users.map(u => get(weeklyUrl(u, r.key, unix(week), unix(addDays(week, 7)) - 1))))).flatMap(parseWeekly);
      const n = new Map<string, number>(); charts.forEach(c => n.set(`${c.artist}\u0000${c.track}`, (n.get(`${c.artist}\u0000${c.track}`) ?? 0) + c.plays));
      const best = [...n].sort((a, b) => b[1] - a[1])[0];
      await db.songs.put({ week, artist: best ? best[0].split('\u0000')[0] : '', track: best ? best[0].split('\u0000')[1] : '', plays: best ? best[1] : 0 });
    }
    return 'ok';
  } catch { return 'offline'; }
}
