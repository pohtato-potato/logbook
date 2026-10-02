import { beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import card from './fixtures/postcard-v1.json';
import { parsePostcard, syncPostcards, openShelf, SHELF_DB, SHELF_VERSION } from '../src/sources/shelf';
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
  it('the shared shelf is opened at one version with one store, by both apps', () => { expect(SHELF_DB).toBe('shelf'); expect(SHELF_VERSION).toBe(1); });
});
describe('copying postcards into Logbook', () => {
  it('copies new ones, updates newer ones, skips bad ones', async () => {
    await syncPostcards(db, async () => [card, { ...card, id: 'health:bad', day: 'nope' }]);
    expect((await db.postcards.get('health:2026-09-28'))?.data).toMatchObject({ steps: 7420 });
    await syncPostcards(db, async () => [{ ...card, steps: 8000, writtenAt: card.writtenAt + 1 }]);
    expect((await db.postcards.get('health:2026-09-28'))?.data).toMatchObject({ steps: 8000 }); expect(await db.postcards.count()).toBe(1);
  });
  it('the real shelf opens and reads empty in a fresh browser', async () => { const s = await openShelf(); expect(s.objectStoreNames.contains('postcards')).toBe(true); s.close(); });
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
