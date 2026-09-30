import { beforeEach, describe, expect, it } from 'vitest';
import weather from './fixtures/openmeteo-weather.json';
import { openDb, type LogbookDb } from '../src/db/db';
import { ensureStamps } from '../src/db/stamps';
import { saveSettings } from '../src/db/actions';
import { homeForDistance, homeOn, stampList } from '../src/domain/stamps';
import { nextBirthday } from '../src/domain/birthday';
import { OfflineError, type FetchJson } from '../src/sources/http';

let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('lo2c-' + n++); await db.open(); });
const homes = [{ name: 'Home 1', lat: 10, lon: 20, from: '1950-01-01' }];
const now = new Date('2026-09-29T15:00:00');
describe('2b leftovers', () => {
  it('a failed day waits 15 minutes before asking again', async () => {
    await saveSettings(db, { homes }); let calls = 0; const fail: FetchJson = async () => { calls++; throw new OfflineError(); };
    await ensureStamps(db, '2026-09-29', now, fail); await ensureStamps(db, '2026-09-29', new Date(now.getTime() + 60_000), fail);
    expect(calls).toBe(2); // weather + air, once
    await ensureStamps(db, '2026-09-29', new Date(now.getTime() + 16 * 60_000), fail); expect(calls).toBe(4);
  });
  it('an unchanged day is not rewritten', async () => {
    await saveSettings(db, { homes }); await ensureStamps(db, '2026-09-20', now, async u => (u.includes('air-quality') ? { hourly: { pm10: [1] } } : weather));
    let writes = 0; db.days.hook('updating', () => { writes++; }); db.days.hook('creating', () => { writes++; });
    await ensureStamps(db, '2026-09-20', now, async () => weather); expect(writes).toBe(0);
  });
  it('air with too little data is remembered as none, not asked again every time', async () => {
    await saveSettings(db, { homes }); let calls = 0;
    const thin: FetchJson = async url => { calls++; return url.includes('air-quality') ? { hourly: { pm10: [1, 2] } } : weather; };
    await ensureStamps(db, '2026-09-29', now, thin); await ensureStamps(db, '2026-09-29', new Date(now.getTime() + 60_000), thin);
    expect(calls).toBe(2); expect((await db.days.get('2026-09-29'))?.stamps?.air).toMatchObject({ none: true });
    expect(stampList({ day: '2026-09-29', today: '2026-09-29', stamps: (await db.days.get('2026-09-29'))?.stamps, pos: null, homes: [], people: [], spans: [] }).map(([k]) => k)).not.toContain('Air outside');
  });
  it('days outside the records say so', async () => { await saveSettings(db, { homes: [{ ...homes[0], from: '1900-01-01' }] }); expect(await ensureStamps(db, '1935-06-01', now, async () => weather)).toBe('none'); });
  it('distance works before 1970, and a home left behind is not "this home"', () => {
    expect(homeForDistance([{ name: 'A', lat: 1, lon: 1, from: '1950-01-01' }, { name: 'B', lat: 2, lon: 2, from: '1950-01-01' }], '1962-05-01')).toBeDefined();
    const left = [{ name: 'A', lat: 1, lon: 1, from: '2015-01-01', to: '2020-01-01' }];
    expect(homeOn(left, '2026-01-01')?.name).toBe('A'); expect(homeOn(left, '2026-01-01', { current: true })).toBeUndefined();
    expect(Object.fromEntries(stampList({ day: '2026-01-01', today: '2026-01-01', pos: null, homes: left, people: [], spans: [] }))['At this home']).toBeUndefined();
  });
  it('past days speak in the past', () => {
    const m = Object.fromEntries(stampList({ day: '2025-12-21', today: '2026-09-29', pos: { lat: 78.22, lon: 15.65, source: 'home' }, homes: [], people: [{ id: 'a', initial: 'A', name: 'Friend A', thread: 0, birthday: '12-21' }], spans: [] }));
    expect(m['Sun']).toBe('The sun didn’t rise'); expect(m['That day was']).toBe('Friend A’s birthday'); expect(m['Today is']).toBeUndefined();
  });
  it('a 29 February birthday falls on 28 February in other years', () => { expect(nextBirthday('02-29', '2027-02-28')?.inDays).toBe(0); expect(nextBirthday('02-29', '2028-02-29')?.inDays).toBe(0); });
});
