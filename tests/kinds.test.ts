import { beforeEach, describe, expect, it } from 'vitest';
import { openDb, type LogbookDb } from '../src/db/db';
import { addPlace, addSpan, keepEntry, setPhotoOfDay } from '../src/db/actions';
import { RATINGS, ratingText } from '../src/domain/rating';

let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('k-' + n++); await db.open(); });
const at = new Date('2026-09-29T21:00:00');

describe('the 1-7 scale', () => {
  it('uses the approved words', () => {
    expect(RATINGS.map(r => r[1])).toEqual(['Complete garbage', 'Terrible', 'Bad', 'Average', 'Good, recommended', 'Exceptional', 'Masterpiece']);
    expect(ratingText(6)).toBe('6 of 7 · Exceptional');
  });
});
describe('keeping other kinds', () => {
  it('keeps a film with its rating and Currently, and undoes it', async () => {
    const r = await keepEntry(db, { kind: 'media', text: 'Quietly wrecked me.', data: { kind: 'media', media: 'Film', title: 'Past Lives', rating: 6, current: false }, at });
    expect(await db.entries.where('kind').equals('media').count()).toBe(1);
    await r.undo.run(); expect(await db.entries.count()).toBe(0);
  });
  it('a place visit counts, and Undo takes it back; the same name is the same place', async () => {
    const id = await addPlace(db, { name: 'The chai stall ', first: false });
    expect(await addPlace(db, { name: 'the CHAI stall', first: false })).toBe(id);
    const r = await keepEntry(db, { kind: 'place', text: '', data: { kind: 'place', placeId: id, first: false }, at });
    expect((await db.places.get(id))?.visits).toBe(1);
    await r.undo.run(); expect((await db.places.get(id))?.visits).toBe(0);
  });
  it('something from before goes on its own date but remembers when it was written', async () => {
    const r = await keepEntry(db, { kind: 'past', text: 'Graduation day.', data: { kind: 'past' }, at, day: '2022-06-14' });
    const e = await db.entries.get(r.entryId);
    expect(e?.day).toBe('2022-06-14'); expect(e!.writtenAt).toBeGreaterThan(Date.UTC(2026, 0, 1));
  });
  it('a person entry records who', async () => {
    const r = await keepEntry(db, { kind: 'person', text: '', data: { kind: 'person', who: ['A', 'R'], how: 'Call' }, at });
    expect((await db.entries.get(r.entryId))?.people).toEqual(['A', 'R']);
  });
  it('refuses a span that ends before it starts', async () => {
    await expect(addSpan(db, { name: 'x', from: '2026-11-10', to: '2026-11-06', family: 'warm' })).rejects.toThrow('ends before it starts');
  });
  it('sets the photo of the day with Undo', async () => {
    const u = await setPhotoOfDay(db, '2026-09-29', 7);
    expect((await db.days.get('2026-09-29'))?.potd).toBe(7);
    await u.run(); expect((await db.days.get('2026-09-29'))?.potd).toBeUndefined();
  });
});
