import { beforeEach, describe, expect, it } from 'vitest';
import { backupToDrive, driveDue } from '../src/sources/drive';
import { openDb, type LogbookDb } from '../src/db/db';
import { getSettings } from '../src/db/actions';
import type { AuthCall } from '../src/sources/http';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { SettingsView } from '../src/screens/Settings';
import { TodayView } from '../src/screens/Today';
import { DEFAULT_SETTINGS } from '../src/db/types';

let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('dr-' + n++); await db.open(); });
type Req = { url: string; method: string; body?: string };
const fake = (existing: { folder?: string; files?: Record<string, string> }) => { const log: Req[] = [];
  const call: AuthCall = async (url, init) => {
    const body = init?.body instanceof Blob ? await init.body.text() : typeof init?.body === 'string' ? init.body : undefined;
    log.push({ url, method: init?.method ?? 'GET', body }); const u = new URL(url), q = u.searchParams.get('q') ?? '';
    if (u.pathname === '/drive/v3/files' && (init?.method ?? 'GET') === 'GET') {
      if (q.includes("mimeType='application/vnd.google-apps.folder'")) return { files: existing.folder ? [{ id: existing.folder }] : [] };
      const name = q.match(/name='([^']+)'/)?.[1] ?? ''; return { files: existing.files?.[name] ? [{ id: existing.files[name] }] : [] };
    }
    if (u.pathname === '/drive/v3/files') return { id: 'NEWFOLDER' };
    return { id: 'F' };
  }; return { call, log }; };
const now = new Date('2026-10-02T10:00:00');
describe('Drive backup', () => {
  it('makes a visible Logbook folder once, then puts the month’s export and backup in it', async () => {
    const { call, log } = fake({});
    expect(await backupToDrive(db, call, now)).toEqual({ files: ['logbook-2026-10-export.zip', 'logbook-2026-10-backup.zip'] });
    expect(log.some(r => r.method === 'POST' && r.body?.includes('"mimeType":"application/vnd.google-apps.folder"') && r.body.includes('"name":"Logbook"'))).toBe(true);
    const uploads = log.filter(r => r.url.includes('/upload/drive/v3/files')); expect(uploads.length).toBe(2);
    expect(uploads.every(r => r.method === 'POST' && r.url.includes('uploadType=multipart') && r.body!.includes('"parents":["NEWFOLDER"]'))).toBe(true);
    expect((await getSettings(db)).lastDrive).toBe(now.getTime());
  });
  it('running again in the same month replaces the month’s files instead of adding copies', async () => {
    const { call, log } = fake({ folder: 'FOLD', files: { 'logbook-2026-10-export.zip': 'E1', 'logbook-2026-10-backup.zip': 'B1' } });
    await backupToDrive(db, call, now);
    const uploads = log.filter(r => r.url.includes('/upload/')); expect(uploads.map(r => [r.method, new URL(r.url).pathname])).toEqual([['PATCH', '/upload/drive/v3/files/E1'], ['PATCH', '/upload/drive/v3/files/B1']]);
    expect(log.some(r => r.method === 'POST' && !r.url.includes('/upload/'))).toBe(false);
  });
  it('a backup is due once a month, only when Drive is set up and on', () => {
    const s = { links: { lastfm: [], googleClientId: 'x' }, sources: { weather: true, places: true, drive: true } } as never;
    expect(driveDue({ ...(s as object), lastDrive: new Date('2026-09-30T10:00:00').getTime() } as never, now)).toBe(true);
    expect(driveDue({ ...(s as object), lastDrive: new Date('2026-10-01T10:00:00').getTime() } as never, now)).toBe(false);
    expect(driveDue({ links: { lastfm: [] } } as never, now)).toBe(false);
  });
  it('Settings offers the backup and says when the last one was made; Today reminds once a month', () => {
    const noop = () => {}, props = { message: '', onVoice: noop, onDayStyle: noop, onTheme: noop, onMotion: noop, onExport: noop, onBackup: noop, onRestore: noop, onStarter: noop, onDrive: noop };
    const html = renderToStaticMarkup(createElement(SettingsView, { ...props, settings: { ...DEFAULT_SETTINGS, links: { lastfm: [], googleClientId: 'x' }, lastDrive: new Date('2026-09-03T10:00:00').getTime() } }));
    expect(html).toContain('Back up to Drive now'); expect(html).toContain('Last on 3 September.');
    const t = renderToStaticMarkup(createElement(TodayView, { now: new Date('2026-10-02T15:00:00'), greeting: 'Hi.', entries: [], moments: [], foldedOpen: false, onToggleFold: noop, onConfirmOverall: noop, onChangeOverall: noop, onOpenFeeling: noop, onEntryMenu: noop, writer: createElement('div'), night: false, driveDue: true }));
    expect(t).toContain('This month’s Drive backup hasn’t been made yet.');
  });
});

