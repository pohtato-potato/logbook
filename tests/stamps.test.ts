import { beforeEach, describe, expect, it } from 'vitest';
import weather from './fixtures/openmeteo-weather.json';
import air from './fixtures/openmeteo-air.json';
import { dayPosition, homeForDistance, homeOn, stampList } from '../src/domain/stamps';
import { openDb, type LogbookDb } from '../src/db/db';
import { ensureStamps, addWhereToday } from '../src/db/stamps';
import { saveSettings } from '../src/db/actions';
import { OfflineError, type FetchJson } from '../src/sources/http';

const homes = [{ name: 'Home 1', lat: 10.001, lon: 20.001, from: '2019-01-01', to: '2025-06-30' }, { name: 'Home 2', lat: 10.2, lon: 20.2, from: '2025-07-01' }];
let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('st-' + n++); await db.open(); });
const fake = (log: string[]): FetchJson => async url => { log.push(new URL(url).host); return url.includes('air-quality') ? air : weather; };
const now = new Date('2026-09-29T15:00:00');

describe('where a day is', () => {
  it('the day’s own position wins, then a place kept that day, then the home of that date', () => {
    expect(dayPosition('2026-09-29', { where: { lat: 1, lon: 2 } }, [], homes)?.source).toBe('here');
    expect(dayPosition('2026-09-29', undefined, [{ lat: 3, lon: 4 }], homes)).toMatchObject({ lat: 3, source: 'place' });
    expect(dayPosition('2020-05-01', undefined, [], homes)).toMatchObject({ lat: 10.001, source: 'home' });
    expect(dayPosition('2026-09-29', undefined, [], [])).toBeNull();
  });
  it('homes by date, and each home takes its turn for distance', () => {
    expect(homeOn(homes, '2026-09-29')?.name).toBe('Home 2'); expect(homeOn(homes, '2018-01-01')).toBeUndefined();
    expect(new Set([0, 1, 2, 3].map(i => homeForDistance(homes, `2026-09-2${i}`)!.name)).size).toBe(2);
  });
  it('stamps read in words and skip what is unknown', () => {
    const list = stampList({ day: '2026-09-29', today: '2026-09-29', stamps: { weather: { code: 2, max: 31.4, min: 24.1, rain: 1.8, final: false, at: 0 }, air: { aqi: 212, category: 'Poor', lead: 'PM2.5', final: false, at: 0 } },
      pos: { lat: 10.2, lon: 20.2, source: 'home' }, homes, people: [{ id: 'a', initial: 'A', name: 'Friend A', thread: 0, birthday: '09-29' }], spans: [{ id: 1, name: 'Trip', from: '2026-10-22', to: '2026-10-25', family: 'warm' }] });
    const m = Object.fromEntries(list);
    expect(m['Outside']).toBe('Partly cloudy, 31° by day, 24° at night, 2 mm rain'); expect(m['Air outside']).toBe('212, poor (India scale)');
    expect(m['Today is']).toBe('Friend A’s birthday'); expect(m['At this home']).toBe('456 days'); expect(m['Next trip']).toBe('Trip, in 23 days');
    expect(m['Sun']).toMatch(/^rise \d{1,2}:\d{2} [ap]m, set \d{1,2}:\d{2} [ap]m$/); expect(list.map(([k]) => k)).toContain('Moon');
    expect(m['From home']).toBeUndefined();
    expect(JSON.stringify(list)).not.toMatch(/undefined|NaN|null/);
  });
  it('away from home, the distance names that day’s home', () => {
    const m = Object.fromEntries(stampList({ day: '2026-09-29', today: '2026-09-29', pos: { lat: 10.3, lon: 20.2, source: 'here' }, homes, people: [], spans: [] }));
    expect(m['From home']).toMatch(/^\d+ km from Home [12]$/);
  });
  it('a span in progress is named with its day number', () => {
    expect(Object.fromEntries(stampList({ day: '2026-10-23', today: '2026-10-23', pos: null, homes: [], people: [], spans: [{ id: 1, name: 'Trip', from: '2026-10-22', to: '2026-10-25', family: 'warm' }] }))['Today is']).toBe('Day 2 of Trip');
  });
  it('with no place and no data, only the moon', () => {
    expect(stampList({ day: '2026-09-29', today: '2026-09-29', pos: null, homes: [], people: [], spans: [] }).map(([k]) => k)).toEqual(['Moon']);
  });
});
describe('fetching and caching', () => {
  it('fetches weather and air once, caches them, and does not ask again within 3 hours', async () => {
    await saveSettings(db, { homes }); const log: string[] = [];
    expect(await ensureStamps(db, '2026-09-29', now, fake(log))).toBe('ok');
    expect((await db.days.get('2026-09-29'))?.stamps).toMatchObject({ weather: { code: 2, final: false }, air: { category: 'Poor' } });
    await ensureStamps(db, '2026-09-29', new Date('2026-09-29T16:00:00'), fake(log)); expect(log).toEqual(['api.open-meteo.com', 'air-quality-api.open-meteo.com']);
  });
  it('a finished day is fetched once and kept for good', async () => {
    await saveSettings(db, { homes }); const log: string[] = [];
    await ensureStamps(db, '2026-09-20', now, fake(log)); await ensureStamps(db, '2026-09-20', new Date('2026-10-05T12:00:00'), fake(log));
    expect(log.length).toBe(2); expect((await db.days.get('2026-09-20'))?.stamps?.weather?.final).toBe(true);
  });
  it('offline leaves the day pending, never throws, and keeps the owner’s own writing untouched', async () => {
    await saveSettings(db, { homes }); await db.days.put({ day: '2026-09-29', grateful: 'tea' });
    expect(await ensureStamps(db, '2026-09-29', now, async () => { throw new OfflineError(); })).toBe('offline');
    expect(await db.days.get('2026-09-29')).toMatchObject({ grateful: 'tea', stamps: { pending: true } });
  });
  it('garbled answers are not cached as weather', async () => {
    await saveSettings(db, { homes });
    expect(await ensureStamps(db, '2026-09-29', now, async () => '<html>')).toBe('offline');
    expect((await db.days.get('2026-09-29'))?.stamps?.weather).toBeUndefined();
  });
  it('switched off: no request; switched off mid-flight: the answer is dropped', async () => {
    await saveSettings(db, { homes, sources: { weather: false, places: true } }); const log: string[] = [];
    expect(await ensureStamps(db, '2026-09-29', now, fake(log))).toBe('off'); expect(log).toEqual([]);
    await saveSettings(db, { sources: { weather: true, places: true } });
    const slow: FetchJson = async url => { await saveSettings(db, { sources: { weather: false, places: true } }); return fake([])(url); };
    await ensureStamps(db, '2026-09-29', now, slow); expect((await db.days.get('2026-09-29'))?.stamps?.weather).toBeUndefined();
  });
  it('no place known: no request', async () => { const log: string[] = []; expect(await ensureStamps(db, '2026-09-29', now, fake(log))).toBe('no-place'); expect(log).toEqual([]); });
  it('before 1940 there is nothing to ask', async () => { await saveSettings(db, { homes: [{ ...homes[0], from: '1900-01-01' }] }); const log: string[] = []; expect(await ensureStamps(db, '1935-06-01', now, fake(log))).toBe('none'); expect(log).toEqual([]); });
  it('a place kept with a position that day is where the weather comes from', async () => {
    const pid = await db.places.add({ name: 'Café', first: false, visits: 1, lat: 12.345, lon: 23.456 });
    await db.entries.add({ day: '2026-09-29', at: now.getTime(), tz: 'UTC', kind: 'place', text: '', marks: {}, tags: [], people: [], writtenAt: 0, data: { kind: 'place', placeId: pid, first: false } });
    const urls: string[] = []; await ensureStamps(db, '2026-09-29', now, async u => { urls.push(u); return u.includes('air-quality') ? air : weather; });
    expect(new URL(urls[0]).searchParams.get('latitude')).toBe('12.35');
  });
  it('adding where I am today is rounded and undoable', async () => {
    const u = await addWhereToday(db, '2026-09-29', { lat: 10.123456, lon: 20.987654 });
    expect((await db.days.get('2026-09-29'))?.stamps?.where).toEqual({ lat: 10.123, lon: 20.988 });
    await u.run(); expect((await db.days.get('2026-09-29'))?.stamps?.where).toBeUndefined();
  });
});
