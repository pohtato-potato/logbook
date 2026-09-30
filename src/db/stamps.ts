import type { LogbookDb } from './db';
import { getSettings, type Undo } from './actions';
import type { DayStamps, Settings } from './types';
import { addDays, dayKey } from '../domain/day';
import { dayPosition } from '../domain/stamps';
import { indianAqi } from '../domain/aqi';
import { airUrl, parseAir, parseWeather, weatherUrl } from '../sources/openMeteo';
import type { FetchJson } from '../sources/http';

export const sourcesOf = (s: Settings) => s.sources ?? { weather: true, places: true };
const STALE = 3 * 3600_000, RETRY = 15 * 60_000, r3 = (x: number) => Math.round(x * 1000) / 1000;
const once = (label: string, fn: () => Promise<unknown>): Undo => { let done = false; return { label, run: async () => { if (done) return; done = true; await fn(); } }; };
/* Places kept on a day that have a position. */
export async function placesOn(db: LogbookDb, day: string) {
  const ids = (await db.entries.where('day').equals(day).toArray()).flatMap(e => (e.data?.kind === 'place' ? [e.data.placeId] : []));
  return (await db.places.bulkGet(ids)).flatMap(p => (p?.lat != null && p.lon != null ? [{ lat: p.lat, lon: p.lon }] : []));
}
const r2 = (x: number) => Math.round(x * 100) / 100;
/* Fills a day's weather and air when they are missing, stale, or were fetched for a different place (each stamp remembers its rough position).
   Never blocks, never throws; what it could not get waits for next time. Stops asking the moment the source is switched off. */
export async function ensureStamps(db: LogbookDb, day: string, now: Date, get: FetchJson): Promise<'ok' | 'off' | 'no-place' | 'offline' | 'none'> {
  try {
    const on = async () => sourcesOf(await getSettings(db)).weather;
    const where = async () => dayPosition(day, (await db.days.get(day))?.stamps, await placesOn(db, day), (await getSettings(db)).homes);
    if (!(await on())) return 'off';
    const row = await db.days.get(day), st: DayStamps = row?.stamps ?? {}, today = dayKey(now), final = day <= addDays(today, -2);
    if (day < '1940-01-01' || day > addDays(today, 14)) return 'none'; // no weather records reach this day
    const pos = await where(); if (!pos) return 'no-place';
    const at = { lat: r2(pos.lat), lon: r2(pos.lon) }, tried = st.tried;
    if (st.pending && tried && now.getTime() - tried.at < RETRY && tried.lat === at.lat && tried.lon === at.lon) return 'offline'; // it just failed here: give it a moment
    const here = (x?: { lat?: number; lon?: number }) => x?.lat === at.lat && x?.lon === at.lon;
    const want = (x?: { final: boolean; at: number; lat?: number; lon?: number }) => !x || !here(x) || (!x.final && now.getTime() - x.at > STALE);
    const next: DayStamps = {}; let failed = false;
    const wu = want(st.weather) ? weatherUrl(day, pos.lat, pos.lon, today) : null;
    if (wu) { try { const w = parseWeather(await get(wu)); if (w) next.weather = { ...w, final, at: now.getTime(), ...at }; else failed = true; } catch { failed = true; } }
    if (!(await on())) return 'off'; // switched off: ask nothing more
    const au = want(st.air) ? airUrl(day, pos.lat, pos.lon, today) : null;
    if (au) { try { const h = parseAir(await get(au)), a = h && indianAqi(h); if (a) next.air = { ...a, final, at: now.getTime(), ...at }; else if (h) next.air = { none: true, final, at: now.getTime(), ...at }; else failed = true; } catch { failed = true; } }
    if (!(await on())) return 'off'; // switched off while we were asking: drop the answer
    const nowPos = await where(); if (!nowPos || r2(nowPos.lat) !== at.lat || r2(nowPos.lon) !== at.lon) return 'ok'; // the place changed meanwhile: these answers are for the old one
    if (!failed && !st.pending && !next.weather && !next.air) return 'ok'; // nothing new: leave the day as it is
    await db.transaction('rw', db.days, async () => {
      const cur = (await db.days.get(day)) ?? { day }, stamps: DayStamps = { ...cur.stamps, ...next };
      if (failed) { stamps.pending = true; stamps.tried = { at: now.getTime(), ...at }; } else { delete stamps.pending; delete stamps.tried; }
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
