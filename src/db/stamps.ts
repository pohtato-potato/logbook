import type { LogbookDb } from './db';
import { getSettings, type Undo } from './actions';
import type { DayStamps, Settings } from './types';
import { addDays, dayKey } from '../domain/day';
import { dayPosition } from '../domain/stamps';
import { indianAqi } from '../domain/aqi';
import { airUrl, parseAir, parseWeather, weatherUrl } from '../sources/openMeteo';
import type { FetchJson } from '../sources/http';

export const sourcesOf = (s: Settings) => s.sources ?? { weather: true, places: true };
const STALE = 3 * 3600_000, r3 = (x: number) => Math.round(x * 1000) / 1000;
const once = (label: string, fn: () => Promise<unknown>): Undo => { let done = false; return { label, run: async () => { if (done) return; done = true; await fn(); } }; };
/* Places kept on a day that have a position. */
export async function placesOn(db: LogbookDb, day: string) {
  const ids = (await db.entries.where('day').equals(day).toArray()).flatMap(e => (e.data?.kind === 'place' ? [e.data.placeId] : []));
  return (await db.places.bulkGet(ids)).flatMap(p => (p?.lat != null && p.lon != null ? [{ lat: p.lat, lon: p.lon }] : []));
}
/* Fills a day's weather and air when they are missing or stale. Never blocks, never throws; what it could not get waits for next time. */
export async function ensureStamps(db: LogbookDb, day: string, now: Date, fetch: FetchJson): Promise<'ok' | 'off' | 'no-place' | 'offline'> {
  try {
    const settings = await getSettings(db); if (!sourcesOf(settings).weather) return 'off';
    const row = await db.days.get(day), st: DayStamps = row?.stamps ?? {}, today = dayKey(now), final = day <= addDays(today, -2);
    const pos = dayPosition(day, st, await placesOn(db, day), settings.homes); if (!pos) return 'no-place';
    const want = (x?: { final: boolean; at: number }) => !x || (!x.final && now.getTime() - x.at > STALE);
    const next: DayStamps = {}; let failed = false;
    const wu = want(st.weather) ? weatherUrl(day, pos.lat, pos.lon, today) : null;
    if (wu) { try { const w = parseWeather(await fetch(wu)); if (w) next.weather = { ...w, final, at: now.getTime() }; else failed = true; } catch { failed = true; } }
    const au = want(st.air) ? airUrl(day, pos.lat, pos.lon, today) : null;
    if (au) { try { const h = parseAir(await fetch(au)), a = h && indianAqi(h); if (a) next.air = { ...a, final, at: now.getTime() }; else if (!h) failed = true; } catch { failed = true; } }
    if (!sourcesOf(await getSettings(db)).weather) return 'off'; // switched off while we were asking: drop the answer
    await db.transaction('rw', db.days, async () => {
      const cur = (await db.days.get(day)) ?? { day }, stamps: DayStamps = { ...cur.stamps, ...next };
      if (failed) stamps.pending = true; else delete stamps.pending;
      await db.days.put({ ...cur, stamps });
    });
    return failed ? 'offline' : 'ok';
  } catch { return 'offline'; }
}
/* "Add where I am today": kept to about 100 m; the day's weather and air are fetched again for this place. */
export async function addWhereToday(db: LogbookDb, day: string, pos: { lat: number; lon: number }): Promise<Undo> {
  const before = await db.days.get(day), cur = before ?? { day }, stamps: DayStamps = { ...cur.stamps, where: { lat: r3(pos.lat), lon: r3(pos.lon) } };
  delete stamps.weather; delete stamps.air;
  await db.days.put({ ...cur, stamps });
  return once('Added where you are', async () => { if (before) await db.days.put(before); else await db.days.delete(day); });
}
