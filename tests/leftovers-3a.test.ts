import { beforeEach, describe, expect, it } from 'vitest';
import weather from './fixtures/openmeteo-weather.json';
import { createLock } from '../src/domain/lock';
import { openDb, type LogbookDb } from '../src/db/db';
import { ensureStamps, addWhereToday } from '../src/db/stamps';
import { saveSettings } from '../src/db/actions';
import { OfflineError } from '../src/sources/http';

let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('lo3a-' + n++); await db.open(); });
const cred = { rawId: new Uint8Array([1]).buffer } as unknown as Credential;
describe('2c leftovers', () => {
  it('setting the lock up again reuses the same user, so the phone replaces the passkey', async () => {
    const ids: string[] = []; const creds = { create: async (o: CredentialCreationOptions) => { ids.push(Array.from(new Uint8Array(o.publicKey!.user.id as ArrayBuffer)).join(',')); return cred; }, get: async () => null };
    const a = await createLock(creds, 'localhost'); const b = await createLock(creds, 'localhost', a!.userId);
    expect(ids[0]).toBe(ids[1]); expect(b!.userId).toBe(a!.userId);
  });
  it('cancelling setup is quiet', async () => expect(await createLock({ create: async () => { throw Object.assign(new Error(), { name: 'NotAllowedError' }); }, get: async () => null }, 'localhost')).toBeNull());
  it('a new place is asked for at once, even just after a failure', async () => {
    await saveSettings(db, { homes: [{ name: 'H', lat: 10, lon: 20, from: '2020-01-01' }] }); const now = new Date('2026-09-29T15:00:00'); const lats: string[] = [];
    await ensureStamps(db, '2026-09-29', now, async () => { throw new OfflineError(); });
    await addWhereToday(db, '2026-09-29', { lat: 30, lon: 40 });
    await ensureStamps(db, '2026-09-29', new Date(now.getTime() + 60_000), async u => { lats.push(new URL(u).searchParams.get('latitude')!); return weather; });
    expect(lats[0]).toBe('30');
  });
});
