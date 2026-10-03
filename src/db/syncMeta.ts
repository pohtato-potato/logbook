import type { Dexie, Transaction } from 'dexie';

/* What sync needs on every record, kept by Dexie hooks so no action has to remember it:
   - uid: the same on every device. Auto-numbered tables get it from what the record was made with (a hash), so a record
     already copied to another device by backup and restore matches there instead of doubling; natural-key tables use their key.
   - updatedAt: when this device last changed it. On a day, userAt is when the owner's own fields last changed (stamps don't count).
   - a tombstone for every delete, so the delete reaches the other devices.
   A write that came from another device carries REMOTE: it keeps that device's times and leaves no tombstone trail. */
export const REMOTE = '__fromSync';
export const AUTO_TABLES = ['entries', 'moments', 'places', 'spans', 'photos'] as const;
export const KEY_TABLES = { days: 'day', people: 'id', words: 'word', tags: 'name', postcards: 'id', songs: 'week' } as const;
export type SyncTable = (typeof AUTO_TABLES)[number] | keyof typeof KEY_TABLES;
export const SYNC_TABLES: SyncTable[] = [...AUTO_TABLES, ...(Object.keys(KEY_TABLES) as (keyof typeof KEY_TABLES)[])];
export const DAY_USER_FIELDS = ['overall', 'grateful', 'headline', 'potd'] as const;
export type DayField = (typeof DAY_USER_FIELDS)[number];
/* Tables whose deletes don't travel: a day row is a container (its fields carry their own times), a tag is shared by entries. */
const NO_TOMBSTONES = new Set<string>(['days', 'tags']);
export type Tombstone = { id: string; table: SyncTable; uid: string; at: number };

/* A short, stable hash (cyrb53), as hex. */
export function hash(s: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}
type R = Record<string, unknown>;
const seed: Record<(typeof AUTO_TABLES)[number], (r: R) => string> = {
  // Only what never changes after a record is made, so an edited copy on another device still matches.
  entries: r => `${r.day}|${r.at}|${r.writtenAt}|${r.kind}`,
  moments: r => `${r.day}|${r.at}`,
  // A place is its name and, when known, its position (to about 100 m): two different "Home"s stay two.
  places: r => `${String(r.name ?? '').trim().toLowerCase()}${typeof r.lat === 'number' && typeof r.lon === 'number' ? `@${(r.lat as number).toFixed(3)},${(r.lon as number).toFixed(3)}` : ''}`,
  spans: r => `${r.name}|${r.from}`,
  photos: r => `${r.day}|${r.addedAt}`,
};
export function uidFor(table: string, r: R): string {
  if (table in KEY_TABLES) return String(r[KEY_TABLES[table as keyof typeof KEY_TABLES]]);
  return `${table}-${hash(seed[table as (typeof AUTO_TABLES)[number]](r))}`;
}
export const isAuto = (t: string): t is (typeof AUTO_TABLES)[number] => (AUTO_TABLES as readonly string[]).includes(t);
/* The time a record from before sync was written, as its first updatedAt. */
export const firstTime = (r: R) => Number(r.writtenAt ?? r.addedAt ?? r.created ?? r.receivedAt ?? 0) || 0;

/* Deletes that came from another device: their tombstone is written by the merge, with that device's time. */
export const quietDeletes = new Set<string>();
let listener: (() => void) | null = null;
/* Called (at most once per change) after the owner changes anything synced on this device. */
export const onLocalChange = (fn: (() => void) | null) => { listener = fn; };
/* This device's clock for edits: never behind any time it has seen from another device, so an edit made after seeing a
   fast-clocked device's edit still counts as the newer one. Kept across restarts. */
const CLOCK = 'logbook-sync-clock';
let clock = (() => { try { return Number(localStorage.getItem(CLOCK)) || 0; } catch { return 0; } })();
const now = () => (clock = Math.max(Date.now(), clock + 1));
export function seeTime(t: unknown) { const n = Number(t); if (Number.isFinite(n) && n > clock) { clock = n; try { localStorage.setItem(CLOCK, String(n)); } catch { /* kept for this session */ } } }
/* Restoring a backup: rows keep the times they were saved with and clearing leaves no tombstones, so a restore never
   counts as a fresh edit or delete on the other devices. */
let quiet = 0;
export async function syncQuiet<T>(fn: () => Promise<T>): Promise<T> { quiet++; try { return await fn(); } finally { quiet--; } }
const after = (trans: Transaction, fn: () => void) => trans.on('complete', fn);

export function installSyncHooks(db: Dexie) {
  const tomb = () => db.table<Tombstone, string>('tombstones');
  for (const name of SYNC_TABLES) {
    const t = db.table(name);
    t.hook('creating', function (_pk, obj: R, trans) {
      const remote = !!obj[REMOTE] || quiet > 0; delete obj[REMOTE];
      if (isAuto(name) && !obj.uid) obj.uid = uidFor(name, obj);
      if (remote) { if (obj.updatedAt == null) obj.updatedAt = firstTime(obj); return; }
      obj.updatedAt = now();
      if (name === 'days') { const at = obj.updatedAt as number, f: R = {}; DAY_USER_FIELDS.forEach(k => { if (obj[k] !== undefined) f[k] = at; }); if (Object.keys(f).length) obj.fieldAt = { ...(obj.fieldAt as R), ...f }; }
      listener?.();
      const id = `${name}:${isAuto(name) ? String(obj.uid) : uidFor(name, obj)}`;
      after(trans, () => { void tomb().delete(id).catch(() => {}); }); // made again (an Undo, or another device): no longer deleted
    });
    (t.hook as unknown as (ev: 'updating', fn: (mods: R, pk: unknown, obj: R) => R) => void)('updating', function (mods: R, _pk: unknown, old: R): R {
      if (mods[REMOTE]) return { [REMOTE]: undefined };
      if (quiet > 0) return {};
      seeTime(old?.updatedAt);
      const at = now(), out: R = { updatedAt: at };
      if (name === 'days') for (const f of DAY_USER_FIELDS) if (Object.keys(mods).some(k => k === f || k.startsWith(f + '.'))) out[`fieldAt.${f}`] = at;
      listener?.();
      return out;
    });
    t.hook('deleting', function (_pk, obj: R, trans) {
      const uid = isAuto(name) ? String(obj?.uid ?? '') : uidFor(name, obj ?? {}), id = `${name}:${uid}`;
      if (!uid || quiet > 0 || NO_TOMBSTONES.has(name)) return;
      if (quietDeletes.delete(id)) return;
      const at = now(); listener?.();
      after(trans, () => { void tomb().put({ id, table: name, uid, at }).catch(() => {}); });
    });
  }
}
