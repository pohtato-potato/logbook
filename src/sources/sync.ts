import type { LogbookDb } from '../db/db';
import { getSettings, saveSettings } from '../db/actions';
import { sourcesOf } from '../db/stamps';
import type { Settings, SyncState } from '../db/types';
import { makeSnapshot, mergeSnapshot, type Merged, type Snapshot } from '../sync/snapshot';
import { CHUNK_SIZE, download, folder, listFolder, put, type Google } from './drive';

/* Sync between devices, through the owner's own Drive: a "sync" folder inside the Logbook folder holds one file per device
   (device-<id>.json, its whole Logbook without the files) and each photo, thumbnail and voice note once. A sync reads the
   other devices' files that changed since last time, merges them in, puts up any files still missing, then its own file. */
const plain = (m: string) => Object.assign(new Error(m), { name: 'PlainMessage' });
export const syncReady = (s: Settings) => !!s.links?.googleClientId && sourcesOf(s).sync;
const newDevice = () => 'd' + Array.from(crypto.getRandomValues(new Uint8Array(6)), b => b.toString(16).padStart(2, '0')).join('');
export type SyncResult = { merged: Merged; devices: string[] };
export async function syncWithDrive(db: LogbookDb, g: Google, o: { label: string; now?: number }): Promise<SyncResult> {
  const stillOn = async () => {
    const s = await getSettings(db);
    if (!s.links?.googleClientId) throw plain('Sync isn’t set up yet. It needs a Google client ID in your starter file.');
    if (!sourcesOf(s).sync) throw plain('Sync between devices is switched off in Settings.');
  };
  await stillOn();
  const before = (await getSettings(db)).sync, state: SyncState = { device: before?.device ?? newDevice(), cursors: { ...before?.cursors }, labels: { ...before?.labels }, ...(before?.last ? { last: before.last } : {}) };
  if (!before?.device) await saveSettings(db, { sync: state });
  const root = await folder(g.call), dir = await folder(g.call, 'sync', root), files = await listFolder(g.call, dir), mine = `device-${state.device}.json`;
  const total: Merged = { added: 0, changed: 0, removed: 0, waiting: 0 };
  const blob = async (name: string) => { const f = files.get(name); if (!f) return null; const b = await download(g.call, f.id); return b instanceof Blob ? b : null; };
  for (const [name, f] of files) {
    if (!/^device-.+\.json$/.test(name) || name === mine) continue;
    await stillOn();
    if (state.cursors[name] === f.modifiedTime) continue;
    const snap = (await download(g.call, f.id)) as Snapshot;
    const r = await mergeSnapshot(db, snap, blob);
    (Object.keys(total) as (keyof Merged)[]).forEach(k => (total[k] += r[k]));
    state.labels![name] = String(snap.label || 'another device');
    if (!r.waiting) state.cursors[name] = f.modifiedTime; // anything still waiting is read again next time
  }
  await stillOn();
  const { snap, blobs } = await makeSnapshot(db, state.device, o.label, o.now);
  for (const [name, get] of blobs) if (!files.has(name)) { await stillOn(); await put(g, dir, name, await get(), CHUNK_SIZE, stillOn, () => {}, null); }
  await put(g, dir, mine, new Blob([JSON.stringify(snap)], { type: 'application/json' }), CHUNK_SIZE, stillOn, () => {}, files.get(mine)?.id ?? null);
  const devices = [...new Set([...files.keys()].filter(n => n !== mine && state.labels![n]).map(n => state.labels![n]))];
  await saveSettings(db, { sync: { ...state, last: o.now ?? Date.now(), with: devices } });
  return { merged: total, devices };
}
