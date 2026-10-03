import type { LogbookDb } from '../db/db';
import { cardsFor, parseCard, type HealthDay, type MediaDay } from '../shelf/shelf';

/* The shared shelf (version 2): a small IndexedDB on the same website where the family's apps leave cards for each other.
   The contract is src/shelf/shelf.ts, a byte-identical copy of the suite's. Logbook copies the cards it reads into its own
   postcards table (so they live in its backup, export and sync): Health's day keeps the shape its screens have always read
   (the v1 Postcard below), and Media's day sits beside it. */
export const POSTCARD_VERSION = 1;
export type Postcard = {
  id: string; app: 'health'; version: 1; day: string; writtenAt: number;
  steps: number | null; sleepMin: number | null;
  workout: { name: string; minutes: number } | null;
  checkin: { at: number } | null;
  walk: { km: number; place: string; next?: string } | null;
  rings: { workout: number; sleep: number; steps: number };
  line: string;
};
const num = (x: unknown, min = 0, max = Infinity) => typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max;
const opt = (x: unknown, ok: (v: Record<string, unknown>) => boolean) => x === null || x === undefined || (typeof x === 'object' && ok(x as Record<string, unknown>));
/* A postcard is used only when every part is what the contract says; anything else is quietly ignored. */
export function parsePostcard(v: unknown): Postcard | null {
  if (!v || typeof v !== 'object') return null;
  const p = v as Record<string, unknown>, r = p.rings as Record<string, unknown> | undefined;
  const ok = p.app === 'health' && p.version === POSTCARD_VERSION && typeof p.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.day) && p.id === `health:${p.day}` && num(p.writtenAt)
    && (p.steps === null || p.steps === undefined || num(p.steps, 0, 500_000)) && (p.sleepMin === null || p.sleepMin === undefined || num(p.sleepMin, 0, 24 * 60))
    && opt(p.workout, w => typeof w.name === 'string' && num(w.minutes, 0, 24 * 60)) && opt(p.checkin, c => num(c.at)) && opt(p.walk, w => num(w.km) && typeof w.place === 'string')
    && !!r && num(r.workout, 0, 1) && num(r.sleep, 0, 1) && num(r.steps, 0, 1) && typeof p.line === 'string';
  if (!ok) return null;
  return { id: p.id as string, app: 'health', version: 1, day: p.day as string, writtenAt: p.writtenAt as number, steps: (p.steps as number) ?? null, sleepMin: (p.sleepMin as number) ?? null,
    workout: (p.workout as Postcard['workout']) ?? null, checkin: (p.checkin as Postcard['checkin']) ?? null, walk: (p.walk as Postcard['walk']) ?? null,
    rings: { workout: r!.workout as number, sleep: r!.sleep as number, steps: r!.steps as number }, line: (p.line as string).slice(0, 300) };
}
/* Health's day card (v2), in the Postcard shape Logbook stores and draws. */
export const fromHealthDay = (d: HealthDay, writtenAt: number): Postcard => ({ id: `health:${d.day}`, app: 'health', version: 1, writtenAt, ...d });
/* Copies the cards left for Logbook into its own table, keeping the newest of each: Health's day and Media's day. Anything else is ignored. */
export async function syncPostcards(db: LogbookDb, read: () => Promise<unknown[]> = () => cardsFor('logbook')): Promise<number> {
  let raw: unknown[]; try { raw = await read(); } catch { return 0; }
  let n = 0;
  for (const v of raw) {
    const c = parseCard(v); if (!c) continue;
    let row: { id: string; app: string; day: string; version: number; data: unknown; writtenAt: number } | null = null;
    if (c.format === 'health.day') { const p = parsePostcard(fromHealthDay(c.data as HealthDay, c.writtenAt)); if (p) row = { id: p.id, app: 'health', day: p.day, version: 1, data: p, writtenAt: c.writtenAt }; }
    else if (c.format === 'media.day') { const d = c.data as MediaDay; row = { id: `media:${d.day}`, app: 'media', day: d.day, version: 1, data: d, writtenAt: c.writtenAt }; }
    if (!row) continue;
    const cur = await db.postcards.get(row.id), curAt = (cur?.data as { writtenAt?: number } | undefined)?.writtenAt ?? (cur as { writtenAt?: number } | undefined)?.writtenAt ?? -1;
    if (row.writtenAt > curAt) { const { writtenAt, ...rest } = row; await db.postcards.put({ ...rest, data: row.app === 'media' ? { ...(row.data as object), writtenAt } : row.data, receivedAt: Date.now() }); n++; }
  }
  return n;
}
