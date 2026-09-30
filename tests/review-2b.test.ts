import { beforeEach, describe, expect, it } from 'vitest';
import weather from './fixtures/openmeteo-weather.json';
import air from './fixtures/openmeteo-air.json';
import { openDb, type LogbookDb } from '../src/db/db';
import { ensureStamps, addWhereToday } from '../src/db/stamps';
import { saveSettings } from '../src/db/actions';
import { parseStarter } from '../src/db/starter';
import type { FetchJson } from '../src/sources/http';

let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('r2b-' + n++); await db.open(); });
const homes = [{ name: 'Home 1', lat: 10.001, lon: 20.001, from: '2019-01-01' }];
const now = new Date('2026-09-29T15:00:00');
const serve = (log: string[]): FetchJson => async url => { const u = new URL(url); log.push(`${u.host} ${u.searchParams.get('latitude')}`); return url.includes('air-quality') ? air : weather; };

describe('stamps belong to the place they were fetched for', () => {
  it('a day whose position changed is fetched again, even when final', async () => {
    await saveSettings(db, { homes }); const log: string[] = [];
    await ensureStamps(db, '2026-09-20', now, serve(log));
    await saveSettings(db, { homes: [{ ...homes[0], lat: 12.5 }] }); // corrected home
    await ensureStamps(db, '2026-09-20', now, serve(log));
    expect(log.filter(l => l.startsWith('api.')).map(l => l.split(' ')[1])).toEqual(['10', '12.5']);
  });
  it('an answer for the old place, arriving after "Add where I am today", is dropped', async () => {
    await saveSettings(db, { homes });
    const slow: FetchJson = async url => { await addWhereToday(db, '2026-09-29', { lat: 30, lon: 40 }); return serve([])(url); };
    await ensureStamps(db, '2026-09-29', now, slow);
    const st = (await db.days.get('2026-09-29'))?.stamps;
    expect(st?.where).toEqual({ lat: 30, lon: 40 }); expect(st?.weather).toBeUndefined();
    const log: string[] = []; await ensureStamps(db, '2026-09-29', now, serve(log));
    expect(log[0]).toBe('api.open-meteo.com 30');
  });
});
describe('switching weather off mid-flight', () => {
  it('sends nothing more once switched off', async () => {
    await saveSettings(db, { homes }); const log: string[] = [];
    const off: FetchJson = async url => { log.push(new URL(url).host); await saveSettings(db, { sources: { weather: false, places: true } }); return weather; };
    expect(await ensureStamps(db, '2026-09-29', now, off)).toBe('off'); expect(log).toEqual(['api.open-meteo.com']);
  });
});
describe('starter homes are checked', () => {
  const file = (home: object) => JSON.stringify({ format: 'logbook-starter', version: 1, people: [], homes: [home] });
  it.each([[{ name: 'H', lat: 10, lon: 20, from: '2019-06' }], [{ name: 'H', lat: 10, lon: 20, from: '2019-6-1' }], [{ name: 'H', lat: 10, lon: 20, from: '2019-06-01', to: 'soon' }], [{ name: 'H', lat: 95, lon: 20, from: '2019-06-01' }], [{ name: 'H', lat: 10, lon: 200, from: '2019-06-01' }]])('refuses %j', h =>
    expect(() => parseStarter(file(h))).toThrow('Nothing was changed.'));
  it('accepts a proper home', () => expect(parseStarter(file({ name: 'H', lat: 10, lon: 20, from: '2019-06-01', to: '2020-01-31' })).homes.length).toBe(1));
});
