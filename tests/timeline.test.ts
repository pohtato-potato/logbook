import { beforeEach, describe, expect, it } from 'vitest';
import { parseTimeline, planImport } from '../src/sources/timeline';
import { importTimeline } from '../src/db/timeline';
import { openDb, type LogbookDb } from '../src/db/db';

const android = { semanticSegments: [
  { startTime: '2024-05-01T09:00:00.000+05:30', endTime: '2024-05-01T11:00:00.000+05:30', visit: { topCandidate: { placeId: 'P1', semanticType: 'HOME', placeLocation: { latLng: '10.0010001°, 20.0010001°' } } } },
  { startTime: '2024-05-01T13:00:00.000+05:30', visit: { topCandidate: { placeId: 'P2', semanticType: 'UNKNOWN', placeLocation: { latLng: '10.0500000°, 20.0500000°' } } } },
  { startTime: '2024-05-02T13:00:00.000+05:30', visit: { topCandidate: { placeId: 'P2', semanticType: 'UNKNOWN', placeLocation: { latLng: '10.0500000°, 20.0500000°' } } } },
  { startTime: '2021-03-01T10:00:00.000+05:30', visit: { topCandidate: { placeId: 'OLD', placeLocation: { latLng: '1°, 2°' } } } },
  { startTime: '2024-05-01T12:00:00.000+05:30', timelinePath: [] }] };
const ios = [{ startTime: '2024-06-01T10:00:00.000+05:30', visit: { topCandidate: { semanticType: 'Work', placeLocation: 'geo:10.200000,20.200000' } } }];
const takeout = { timelineObjects: [{ placeVisit: { location: { latitudeE7: 102000000, longitudeE7: 202000000, name: 'The chai stall', placeId: 'P9' }, duration: { startTimestamp: '2022-07-01T08:00:00Z' } } }, { activitySegment: {} }] };

let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('tl-' + n++); await db.open(); });
describe('reading Timeline exports', () => {
  it('the Android on-device export: visits since 2022 only, with home and work', () => {
    const v = parseTimeline(android);
    expect(v.length).toBe(3); expect(v[0]).toMatchObject({ lat: 10.0010001, lon: 20.0010001, kind: 'home', placeId: 'P1' });
  });
  it('the iPhone export and the older Takeout one (which has names)', () => {
    expect(parseTimeline(ios)[0]).toMatchObject({ lat: 10.2, lon: 20.2, kind: 'work' });
    expect(parseTimeline(takeout)[0]).toMatchObject({ lat: 10.2, lon: 20.2, name: 'The chai stall', placeId: 'P9' });
  });
  it('anything else is nothing, without throwing', () => { expect(parseTimeline({ hello: 1 })).toEqual([]); expect(parseTimeline('nope')).toEqual([]); });
});
describe('planning and importing', () => {
  it('one place per spot, one visit per day per place, and a plain preview', () => {
    const plan = planImport(parseTimeline(android), []);
    expect(plan.places.map(p => p.name)).toEqual(['Home', 'A place near 10.05, 20.05']); expect(plan.visits.length).toBe(3);
    expect(plan.summary).toBe('3 visits on 2 days at 2 places, 1 May 2024 to 2 May 2024.');
  });
  it('a known place nearby is reused, not doubled', () => {
    const plan = planImport(parseTimeline(android), [{ id: 7, name: 'Home sweet home', first: false, visits: 4, lat: 10.001, lon: 20.001 }]);
    expect(plan.places.filter(p => p.existingId === 7).length).toBe(1); expect(plan.places.find(p => p.existingId === 7)!.name).toBe('Home sweet home');
  });
  it('imports as places and visits on their days, skips what is already there, and one Undo removes it all', async () => {
    const r = await importTimeline(db, planImport(parseTimeline(android), []));
    expect(r.added).toBe(3); expect(await db.places.count()).toBe(2);
    const e = await db.entries.toArray(); expect(e.map(x => x.day).sort()).toEqual(['2024-05-01', '2024-05-01', '2024-05-02']); expect(e.every(x => x.kind === 'place' && x.source === 'timeline')).toBe(true);
    const again = await importTimeline(db, planImport(parseTimeline(android), await db.places.toArray())); expect(again.added).toBe(0);
    await r.undo.run(); expect(await db.entries.count()).toBe(0); expect(await db.places.count()).toBe(0);
  });
});
