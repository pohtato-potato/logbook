import type { LogbookDb } from '../db/db';
import { getSettings, saveSettings } from '../db/actions';
import { sourcesOf } from '../db/stamps';
import type { Settings } from '../db/types';
import { makeMarkdownZip } from '../db/exportMarkdown';
import { makeBackupZip } from '../db/backup';
import { OfflineError, type AuthCall, type AuthSend } from './http';

/* Drive backup: a monthly copy of the export and the backup in a visible "Logbook" folder. With the drive.file permission,
   Logbook can only see the files it made itself; the rest of the Drive stays out of reach. */
const API = 'https://www.googleapis.com/drive/v3/files', UP = 'https://www.googleapis.com/upload/drive/v3/files', FOLDER = 'application/vnd.google-apps.folder';
export const CHUNK_SIZE = 4 * 1024 * 1024;
/* The oldest match, so two devices that both made a folder at once still settle on the same one. */
export const find = async (call: AuthCall, q: string) => ((await call(`${API}?${new URLSearchParams({ q, fields: 'files(id,name)', spaces: 'drive', orderBy: 'createdTime' })}`)) as { files?: { id: string }[] }).files?.[0]?.id;
/* A folder Logbook made ("Logbook" at the top, or one inside it), made if it isn't there yet. */
export async function folder(call: AuthCall, name = 'Logbook', parent?: string): Promise<string> {
  const have = await find(call, `name='${name}' and mimeType='${FOLDER}'${parent ? ` and '${parent}' in parents` : ''} and trashed=false`); if (have) return have;
  const made = ((await call(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, mimeType: FOLDER, ...(parent ? { parents: [parent] } : {}) }) })) as { id: string }).id;
  return (await find(call, `name='${name}' and mimeType='${FOLDER}'${parent ? ` and '${parent}' in parents` : ''} and trashed=false`)) ?? made; // another device may have made one a moment earlier
}
/* Every file in a folder, with when it last changed (followed across pages). */
export async function listFolder(call: AuthCall, parent: string): Promise<Map<string, { id: string; modifiedTime: string }>> {
  const out = new Map<string, { id: string; modifiedTime: string }>(); let page = '';
  do {
    const r = (await call(`${API}?${new URLSearchParams({ q: `'${parent}' in parents and trashed=false`, fields: 'nextPageToken,files(id,name,modifiedTime)', pageSize: '1000', spaces: 'drive', ...(page ? { pageToken: page } : {}) })}`)) as { files?: { id: string; name: string; modifiedTime: string }[]; nextPageToken?: string };
    for (const f of r.files ?? []) { const had = out.get(f.name); if (!had || f.modifiedTime > had.modifiedTime) out.set(f.name, { id: f.id, modifiedTime: f.modifiedTime }); } // two files of one name: the newest
    page = r.nextPageToken ?? '';
  } while (page);
  return out;
}
export const download = (call: AuthCall, id: string) => call(`${API}/${id}?alt=media`);
/* Each file goes up as a resumable upload, a few MB at a time, so a large archive on a slow connection still gets there
   (each piece has its own time limit). Drive's switch is read again before every piece. */
const CHUNK = 4 * 1024 * 1024;
export async function put(g: Google, parent: string, name: string, blob: Blob, chunk: number, stillOn: () => Promise<void>, step: (bytes: number) => void, known?: string | null) {
  const id = known !== undefined ? known : await find(g.call, `name='${name}' and '${parent}' in parents and trashed=false`), type = blob.type || 'application/zip';
  const start = await g.send(id ? `${UP}/${id}?uploadType=resumable` : `${UP}?uploadType=resumable`, { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': type, 'X-Upload-Content-Length': String(blob.size) }, body: JSON.stringify(id ? { name } : { name, parents: [parent] }) });
  const session = start.headers.get('Location'); if (!session?.startsWith('https://www.googleapis.com/')) throw new OfflineError();
  let at = 0;
  for (;;) {
    await stillOn();
    const end = Math.min(at + chunk, blob.size), r = await g.send(session, { method: 'PUT', headers: { 'Content-Range': blob.size ? `bytes ${at}-${end - 1}/${blob.size}` : 'bytes */0' }, body: blob.slice(at, end) });
    if (r.status === 308) { const got = r.headers.get('Range'); step((got ? Number(got.split('-')[1]) + 1 : end) - at); at = got ? Number(got.split('-')[1]) + 1 : end; continue; }
    if (r.ok) { step(end - at); return; }
    throw new OfflineError();
  }
}
export type Google = { call: AuthCall; send: AuthSend };
export async function backupToDrive(db: LogbookDb, g: Google, now = new Date(), o: { chunk?: number; onProgress?: (fraction: number) => void } = {}): Promise<{ files: string[] }> {
  const stillOn = async () => { if (!sourcesOf(await getSettings(db)).drive) throw Object.assign(new Error('Drive backup was switched off, so the upload stopped.'), { name: 'PlainMessage' }); };
  await stillOn();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, parent = await folder(g.call);
  const files: [string, Blob][] = [[`logbook-${month}-export.zip`, await makeMarkdownZip(db)], [`logbook-${month}-backup.zip`, await makeBackupZip(db)]];
  const total = files.reduce((n, f) => n + f[1].size, 0) || 1; let sent = 0;
  for (const [name, blob] of files) await put(g, parent, name, blob, o.chunk ?? CHUNK, stillOn, n => { sent += n; o.onProgress?.(Math.min(1, sent / total)); });
  await saveSettings(db, { lastDrive: now.getTime() });
  return { files: files.map(f => f[0]) };
}
/* A month's Drive backup is due when Drive is set up and on, and none has been made this month. */
export function driveDue(s: Settings, now = new Date()): boolean {
  if (!s.links?.googleClientId || !sourcesOf(s).drive) return false;
  const last = s.lastDrive ? new Date(s.lastDrive) : null;
  return !last || last.getFullYear() !== now.getFullYear() || last.getMonth() !== now.getMonth();
}
