import type { LogbookDb } from '../db/db';
import { saveSettings } from '../db/actions';
import { sourcesOf } from '../db/stamps';
import type { Settings } from '../db/types';
import { makeMarkdownZip } from '../db/exportMarkdown';
import { makeBackupZip } from '../db/backup';
import type { AuthCall } from './http';

/* Drive backup: a monthly copy of the export and the backup in a visible "Logbook" folder. With the drive.file permission,
   Logbook can only see the files it made itself; the rest of the Drive stays out of reach. */
const API = 'https://www.googleapis.com/drive/v3/files', UP = 'https://www.googleapis.com/upload/drive/v3/files', FOLDER = 'application/vnd.google-apps.folder';
const find = async (call: AuthCall, q: string) => ((await call(`${API}?${new URLSearchParams({ q, fields: 'files(id,name)', spaces: 'drive' })}`)) as { files?: { id: string }[] }).files?.[0]?.id;
async function folder(call: AuthCall): Promise<string> {
  const have = await find(call, `name='Logbook' and mimeType='${FOLDER}' and trashed=false`); if (have) return have;
  return ((await call(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Logbook', mimeType: FOLDER }) })) as { id: string }).id;
}
async function put(call: AuthCall, parent: string, name: string, blob: Blob) {
  const id = await find(call, `name='${name}' and '${parent}' in parents and trashed=false`), boundary = 'logbook' + Math.random().toString(16).slice(2);
  const meta = id ? { name } : { name, parents: [parent] };
  const body = new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${blob.type || 'application/zip'}\r\n\r\n`, blob, `\r\n--${boundary}--`], { type: `multipart/related; boundary=${boundary}` });
  await call(id ? `${UP}/${id}?uploadType=multipart` : `${UP}?uploadType=multipart`, { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body });
}
export async function backupToDrive(db: LogbookDb, call: AuthCall, now = new Date()): Promise<{ files: string[] }> {
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, parent = await folder(call);
  const files: [string, Blob][] = [[`logbook-${month}-export.zip`, await makeMarkdownZip(db)], [`logbook-${month}-backup.zip`, await makeBackupZip(db)]];
  for (const [name, blob] of files) await put(call, parent, name, blob);
  await saveSettings(db, { lastDrive: now.getTime() });
  return { files: files.map(f => f[0]) };
}
/* A month's Drive backup is due when Drive is set up and on, and none has been made this month. */
export function driveDue(s: Settings, now = new Date()): boolean {
  if (!s.links?.googleClientId || !sourcesOf(s).drive) return false;
  const last = s.lastDrive ? new Date(s.lastDrive) : null;
  return !last || last.getFullYear() !== now.getFullYear() || last.getMonth() !== now.getMonth();
}
