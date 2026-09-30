import type { LogbookDb } from './db';

export class BackupError extends Error { constructor(msg: string) { super(msg); this.name = 'BackupError'; } }
export interface Backup { format: 'logbook-backup'; version: 1; exportedAt: string; tables: Record<string, unknown[]> }
/* Stage 1 has no photos; when they arrive (Stage 2) their blobs are written as data URLs here. */
const TABLES = ['entries', 'moments', 'days', 'people', 'words', 'settings', 'places', 'spans', 'postcards', 'tags'] as const;
export async function makeBackup(db: LogbookDb): Promise<Backup> {
  const tables: Record<string, unknown[]> = {};
  for (const t of TABLES) tables[t] = await db.table(t).toArray();
  return { format: 'logbook-backup', version: 1, exportedAt: new Date().toISOString(), tables };
}
const NOT_BACKUP = 'This file isn’t a Logbook backup. Nothing was changed.';
/* Takes the file's text or its parsed contents; anything unreadable or incomplete changes nothing. */
export async function restoreBackup(db: LogbookDb, data: unknown): Promise<void> {
  if (typeof data === 'string') { try { data = JSON.parse(data); } catch { throw new BackupError(NOT_BACKUP); } }
  const b = data as Partial<Backup>;
  if (!b || b.format !== 'logbook-backup' || b.version !== 1 || typeof b.tables !== 'object' || !b.tables) throw new BackupError(NOT_BACKUP);
  const tables = b.tables;
  if (TABLES.some(t => !Array.isArray(tables[t]))) throw new BackupError('This backup isn’t complete. Nothing was changed.');
  await db.transaction('rw', TABLES.map(t => db.table(t)), async () => {
    for (const t of TABLES) { await db.table(t).clear(); const rows = tables[t]; if (Array.isArray(rows) && rows.length) await db.table(t).bulkPut(rows); }
  });
}
