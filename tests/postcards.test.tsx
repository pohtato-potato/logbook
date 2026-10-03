import { beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import card from './fixtures/postcard-v1.json';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import healthDay from './fixtures/shelf/health.day-v2.json';
import mediaDay from './fixtures/shelf/media.day-v1.json';
import { parsePostcard, syncPostcards } from '../src/sources/shelf';
import { openShelf, SHELF_DB, SHELF_VERSION } from '../src/shelf/shelf';
import { openDb, type LogbookDb } from '../src/db/db';
import { PostcardView } from '../src/screens/Postcard';
import { TodayView } from '../src/screens/Today';

let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('pc-' + n++); await db.open(); });
describe('the postcard contract (v1)', () => {
  it('accepts the contract fixture', () => expect(parsePostcard(card)?.steps).toBe(7420));
  it('refuses a different version, a missing day, or nonsense numbers', () => {
    expect(parsePostcard({ ...card, version: 2 })).toBeNull(); expect(parsePostcard({ ...card, day: 'yesterday' })).toBeNull();
    expect(parsePostcard({ ...card, steps: -5 })).toBeNull(); expect(parsePostcard({ ...card, rings: { workout: 'x' } })).toBeNull(); expect(parsePostcard('<html>')).toBeNull();
  });
  it('missing parts are allowed as null', () => expect(parsePostcard({ ...card, workout: null, walk: null, checkin: null, steps: null })).not.toBeNull());
  it('the shared shelf is version 2', () => { expect(SHELF_DB).toBe('shelf'); expect(SHELF_VERSION).toBe(2); });
});
describe('copying cards from the shelf (v2) into Logbook', () => {
  it("Health's day (health.day v2) is kept in the shape Logbook's screens read, newest wins, broken ones skipped", async () => {
    await syncPostcards(db, async () => [healthDay, { ...healthDay, id: 'health.day:bad', data: { ...healthDay.data, day: 'nope' } }]);
    const row = await db.postcards.get('health:2026-09-28');
    expect(row).toMatchObject({ app: 'health', day: '2026-09-28' }); expect(parsePostcard(row!.data)?.steps).toBe(7420);
    await syncPostcards(db, async () => [{ ...healthDay, writtenAt: healthDay.writtenAt + 1, data: { ...healthDay.data, steps: 8000 } }]);
    expect(parsePostcard((await db.postcards.get('health:2026-09-28'))!.data)?.steps).toBe(8000); expect(await db.postcards.count()).toBe(1);
  });
  it("Media's day (media.day v1) is kept beside it", async () => {
    await syncPostcards(db, async () => [mediaDay]);
    const row = await db.postcards.get('media:2026-10-02');
    expect(row).toMatchObject({ app: 'media', day: '2026-10-02' }); expect((row!.data as { items: unknown[] }).items).toHaveLength(2);
  });
  it('the real shelf opens at version 2 with its cards store in a fresh browser', async () => { const s = await openShelf(); expect(s.objectStoreNames.contains('cards')).toBe(true); expect(s.objectStoreNames.contains('postcards')).toBe(false); s.close(); });
  it.skipIf(!existsSync('../Suite/shelf'))("Logbook's copies of the contract and fixtures are byte-identical to the suite's", () => {
    expect(readFileSync('src/shelf/shelf.ts', 'utf8')).toBe(readFileSync('../Suite/shelf/shelf.ts', 'utf8'));
    for (const f of readdirSync('tests/fixtures/shelf')) expect(readFileSync(`tests/fixtures/shelf/${f}`, 'utf8')).toBe(readFileSync(`../Suite/shelf/fixtures/${f}`, 'utf8'));
  });
});
describe('the postcard on Today', () => {
  it('draws Health’s rings with words, and its line', () => {
    const html = renderToStaticMarkup(<PostcardView card={parsePostcard(card)!} night={false} />);
    expect(html).toContain('Postcard from Health'); expect(html).toContain('7,420'); expect(html).toContain('6 h 50 m'); expect(html).toContain('Upper body, 38 min');
    expect(html).toMatch(/aria-label="Health’s three rings: workout closed, sleep 86%, steps 74%"/); expect(html).toContain('An easy walking day.'); expect(html).toContain('Jaipur');
  });
  it('sits in the day, and folds at night', () => {
    const base = { now: new Date('2026-09-29T15:00:00'), greeting: 'Hi.', entries: [], moments: [], foldedOpen: false, onToggleFold() {}, onConfirmOverall() {}, onChangeOverall() {}, onOpenFeeling() {}, onEntryMenu() {}, writer: <div />, postcard: parsePostcard(card)! };
    expect(renderToStaticMarkup(<TodayView {...base} night={false} />)).toContain('Postcard from Health');
    const night = renderToStaticMarkup(<TodayView {...base} night={true} />); expect(night).not.toContain('Postcard from Health'); expect(night).toContain('yesterday from Health');
  });
});
