import { db } from '../db/db';
import { getSettings } from '../db/actions';
import type { Settings } from '../db/types';
import { DRIVE_SCOPE, signIn, token } from '../sources/google';
import { authCall, authSend } from '../sources/http';
import { syncReady, syncWithDrive, type SyncResult } from '../sources/sync';

/* What this device calls itself on the other devices. */
export const deviceLabel = (ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent) => (/iPad|Tablet/i.test(ua) ? 'Tablet' : /Android|iPhone|Mobile/i.test(ua) ? 'Phone' : 'Laptop');
const count = (n: number, word: string) => (n ? [`${n} ${word}`] : []);
export function syncMessage(r: SyncResult): string {
  const m = r.merged, parts = [...count(m.added, 'new'), ...count(m.changed, 'changed'), ...count(m.removed, 'removed')];
  const wait = m.waiting ? ` ${m.waiting} ${m.waiting === 1 ? 'thing is' : 'things are'} still on ${m.waiting === 1 ? 'its' : 'their'} way and will come next time.` : '';
  if (!r.devices.length) return 'Synced. This is the first device; the others will pick it up when they sync.';
  const who = r.devices.join(' and ');
  return parts.length ? `Synced with ${who}: ${parts.join(', ')}.${wait}` : `Synced with ${who}.${wait ? wait : ' Nothing new.'}`;
}
/* A day without a sync, on a device where sync is set up and on. */
export const syncDue = (s: Settings, now = new Date()) => syncReady(s) && (!s.sync?.last || now.getTime() - s.sync.last > 24 * 3600_000);
let running: Promise<SyncResult | null> | null = null;
/* One sync at a time. Asked for (a tap): unlocks first if the lock is on (private entries leave only after an unlock), and
   signs in if needed. Automatic: never while locked, only while this session already has a Google token, and silent. */
export async function runSync(asked: boolean, o: { locked?: boolean; unlock?: () => Promise<boolean> } = {}): Promise<SyncResult | null> {
  if (o.locked && (!asked || !(await o.unlock?.()))) return null;
  if (running) { if (!asked) return running; await running.catch(() => null); }
  running = (async () => {
    const s = await getSettings(db); if (!syncReady(s)) { if (asked) throw Object.assign(new Error('Sync is switched off or not set up, so nothing was synced.'), { name: 'PlainMessage' }); return null; }
    const t = token([DRIVE_SCOPE]) ?? (asked ? await signIn(s.links!.googleClientId!, [DRIVE_SCOPE]) : null);
    if (!t) { if (asked) throw Object.assign(new Error('Sign-in didn’t finish, so nothing was synced.'), { name: 'PlainMessage' }); return null; }
    return syncWithDrive(db, { call: authCall(t), send: authSend(t) }, { label: deviceLabel() });
  })().finally(() => { running = null; });
  return running;
}
