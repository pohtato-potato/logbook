import type { LogbookDb } from '../db/db';

/* The shared shelf: a small IndexedDB on the same website where each app in the family leaves daily "postcards" for the others.
   Health writes its own; Logbook only reads. Both apps open it at the same version with the same store, so either may create it.
   This file and Health's copy are pinned by the same contract fixture (tests/fixtures/postcard-v1.json in both repos). */
export const SHELF_DB = 'shelf', SHELF_VERSION = 1, SHELF_STORE = 'postcards', POSTCARD_VERSION = 1;
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
export function openShelf(): Promise<IDBDatabase> {
  return new Promise((ok, no) => {
    const req = indexedDB.open(SHELF_DB, SHELF_VERSION);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(SHELF_STORE)) req.result.createObjectStore(SHELF_STORE, { keyPath: 'id' }); };
    req.onsuccess = () => ok(req.result); req.onerror = () => no(req.error);
  });
}
export async function readShelf(): Promise<unknown[]> {
  const s = await openShelf();
  try { return await new Promise((ok, no) => { const q = s.transaction(SHELF_STORE).objectStore(SHELF_STORE).getAll(); q.onsuccess = () => ok(q.result as unknown[]); q.onerror = () => no(q.error); }); }
  finally { s.close(); }
}
/* Copies Health's postcards into Logbook's own table (so they survive in Logbook's backup and export), keeping the newest of each. */
export async function syncPostcards(db: LogbookDb, read: () => Promise<unknown[]> = readShelf): Promise<number> {
  let raw: unknown[]; try { raw = await read(); } catch { return 0; }
  let n = 0;
  for (const v of raw) {
    const p = parsePostcard(v); if (!p) continue;
    const cur = await db.postcards.get(p.id), curAt = (cur?.data as Postcard | undefined)?.writtenAt ?? -1;
    if (p.writtenAt > curAt) { await db.postcards.put({ id: p.id, app: 'health', day: p.day, version: p.version, data: p, receivedAt: Date.now() }); n++; }
  }
  return n;
}
