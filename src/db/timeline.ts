import { timeZone } from '../domain/day';
import type { ImportPlan } from '../sources/timeline';
import { guard, once, type Undo } from './actions';
import type { LogbookDb } from './db';
import type { Entry, Place } from './types';

/* Keeps a previewed Timeline import in one write: new places, and one place entry per visit-day marked as from Timeline.
   A visit already in the logbook (same place, same day) is skipped, so importing the same file twice adds nothing. One Undo removes the whole import. */
export async function importTimeline(db: LogbookDb, plan: ImportPlan): Promise<{ added: number; undo: Undo }> {
  return guard(() => db.transaction('rw', db.entries, db.places, async () => {
    const before = new Map<number, Place>(), made: number[] = [], ids = new Map<number, number>();
    for (const p of plan.places) {
      if (p.existingId != null) { const cur = await db.places.get(p.existingId); if (cur) { before.set(cur.id!, cur); ids.set(p.key, cur.id!); continue; } }
      const id = await db.places.add({ name: p.name, first: false, visits: 0, lat: p.lat, lon: p.lon }); made.push(id); ids.set(p.key, id);
    }
    const have = new Set((await db.entries.where('kind').equals('place').toArray()).flatMap(e => (e.data?.kind === 'place' ? [`${e.data.placeId}|${e.day}`] : [])));
    const tz = timeZone(), now = Date.now(), add: Entry[] = [], visits = new Map<number, number>();
    for (const v of plan.visits) {
      const placeId = ids.get(v.place)!; if (have.has(`${placeId}|${v.day}`)) continue;
      add.push({ day: v.day, at: v.at, tz, kind: 'place', text: '', marks: {}, tags: [], people: [], writtenAt: now, data: { kind: 'place', placeId, first: false }, source: 'timeline' });
      visits.set(placeId, (visits.get(placeId) ?? 0) + 1);
    }
    const entryIds = add.length ? ((await db.entries.bulkAdd(add, { allKeys: true })) as number[]) : [];
    for (const [id, n] of visits) { const cur = before.get(id) ?? (await db.places.get(id)); if (cur) await db.places.put({ ...cur, visits: cur.visits + n }); }
    const unused = made.filter(id => !visits.has(id)); if (unused.length) await db.places.bulkDelete(unused);
    return { added: add.length, undo: once('Imported', () => db.transaction('rw', db.entries, db.places, async () => {
      await db.entries.bulkDelete(entryIds); await db.places.bulkDelete(made.filter(id => visits.has(id))); await db.places.bulkPut([...before.values()]);
    })) };
  }));
}
