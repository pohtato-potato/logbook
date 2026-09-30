import type { LogbookDb } from './db';
import { makeZip, readZip } from '../domain/zip';

export class BackupError extends Error { constructor(msg: string) { super(msg); this.name = 'BackupError'; } }
export interface Backup { format: 'logbook-backup'; version: 1; exportedAt: string; tables: Record<string, unknown[]> }
/* Every table. Photos arrived in Stage 2, so a Stage 1 backup without them still restores. */
const TABLES = ['entries', 'moments', 'days', 'people', 'words', 'settings', 'places', 'spans', 'postcards', 'tags', 'photos'] as const;
const OPTIONAL = new Set<string>(['photos']);
/* Photos and voice notes are Blobs; in the backup file each one becomes { __blob, type, base64 } and turns back into a Blob on restore. */
async function pack(v: unknown): Promise<unknown> {
  if (v instanceof Blob) { const b = new Uint8Array(await v.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return { __blob: true, type: v.type, base64: btoa(s) }; }
  if (Array.isArray(v)) return Promise.all(v.map(pack));
  if (v && typeof v === 'object') return Object.fromEntries(await Promise.all(Object.entries(v).map(async ([k, x]) => [k, await pack(x)])));
  return v;
}
function unpack(v: unknown): unknown {
  if (v instanceof Blob) return v;
  if (v && typeof v === 'object' && (v as { __blob?: boolean }).__blob) { const { type, base64 } = v as { type: string; base64: string }; const s = atob(base64), b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return new Blob([b], { type }); }
  if (Array.isArray(v)) return v.map(unpack);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, unpack(x)]));
  return v;
}
export async function makeBackup(db: LogbookDb): Promise<Backup> {
  const tables: Record<string, unknown[]> = {};
  for (const t of TABLES) tables[t] = (await pack(await db.table(t).toArray())) as unknown[];
  return { format: 'logbook-backup', version: 1, exportedAt: new Date().toISOString(), tables };
}
const NOT_BACKUP = 'This file isn’t a Logbook backup. Nothing was changed.';
/* Takes the file's text or its parsed contents; anything unreadable or incomplete changes nothing. */
export async function restoreBackup(db: LogbookDb, data: unknown): Promise<void> {
  if (typeof data === 'string') { try { data = JSON.parse(data); } catch { throw new BackupError(NOT_BACKUP); } }
  const b = data as Partial<Backup>;
  if (!b || b.format !== 'logbook-backup' || b.version !== 1 || typeof b.tables !== 'object' || !b.tables) throw new BackupError(NOT_BACKUP);
  const tables = b.tables;
  if (TABLES.some(t => !OPTIONAL.has(t) && !Array.isArray(tables[t]))) throw new BackupError('This backup isn’t complete. Nothing was changed.');
  await db.transaction('rw', TABLES.map(t => db.table(t)), async () => {
    for (const t of TABLES) { await db.table(t).clear(); const rows = tables[t]; if (Array.isArray(rows) && rows.length) await db.table(t).bulkPut(unpack(rows) as unknown[]); }
  });
}

/* The backup file: a zip holding backup.json, with every photo and voice note as its own file beside it (blobs/N).
   Nothing is turned into one giant string, so it keeps working as years of photos pile up. Older .json backups still restore. */
export async function makeBackupZip(db: LogbookDb): Promise<Blob> {
  const files: { path: string; data: Uint8Array }[] = [];
  const out = async (v: unknown): Promise<unknown> => {
    if (v instanceof Blob) { const path = `blobs/${files.length + 1}`; files.push({ path, data: new Uint8Array(await v.arrayBuffer()) }); return { __file: path, type: v.type }; }
    if (Array.isArray(v)) { const r: unknown[] = []; for (const x of v) r.push(await out(x)); return r; }
    if (v && typeof v === 'object') { const r: Record<string, unknown> = {}; for (const [k, x] of Object.entries(v)) r[k] = await out(x); return r; }
    return v;
  };
  const tables: Record<string, unknown[]> = {};
  for (const t of TABLES) tables[t] = (await out(await db.table(t).toArray())) as unknown[];
  const json: Backup = { format: 'logbook-backup', version: 1, exportedAt: new Date().toISOString(), tables };
  return makeZip([{ path: 'backup.json', data: JSON.stringify(json) }, ...files]);
}
export async function restoreBackupFile(db: LogbookDb, file: Blob): Promise<void> {
  const head = new Uint8Array(await file.slice(0, 2).arrayBuffer());
  if (head[0] !== 0x50 || head[1] !== 0x4b) return restoreBackup(db, await file.text());
  const parts = await readZip(file), main = parts.get('backup.json');
  if (!main) throw new BackupError(NOT_BACKUP);
  let data: unknown; try { data = JSON.parse(await main.text()); } catch { throw new BackupError(NOT_BACKUP); }
  const back = (v: unknown): unknown => {
    if (v && typeof v === 'object' && typeof (v as { __file?: unknown }).__file === 'string') { const { __file, type } = v as { __file: string; type: string }; const b = parts.get(__file); if (!b) throw new BackupError('This backup isn’t complete. Nothing was changed.'); return new Blob([b], { type }); }
    if (Array.isArray(v)) return v.map(back);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, back(x)]));
    return v;
  };
  return restoreBackup(db, back(data));
}
