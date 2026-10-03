import { beforeEach, describe, expect, it } from 'vitest';
import { keepEntry } from '../src/db/actions';
import { openDb, type LogbookDb } from '../src/db/db';
import { handoverState, letGo, movedBackup, writeHandovers } from '../src/shelf/handover';
import { cardsFor, parseCard, putCards, type Card } from '../src/shelf/shelf';

let db: LogbookDb, idb: IDBFactory, n = 0;
beforeEach(async () => { db = openDb('ho-' + n++); await db.open(); idb = new IDBFactory(); });
const film = (title: string, over: Partial<{ rating: number; current: boolean; text: string }> = {}) =>
  keepEntry(db, { kind: 'media', text: over.text ?? '', at: new Date('2026-09-14T21:00:00'), data: { kind: 'media', media: 'Film', title, rating: over.rating ?? 6, current: over.current ?? false } });
const receipt = (uid: string): Card => ({ id: `media.receipt:${uid}`, format: 'media.receipt', version: 1, from: 'media', to: 'logbook', about: { item: uid }, writtenAt: 1, data: { uid, workId: `lb-${uid}` } });
const mediaEntries = async () => (await db.entries.toArray()).filter(e => e.kind === 'media');

describe('the hand-over to Media (spec §12, owner’s choices B and 6A)', () => {
  it('writes one logbook.handover card per film, book or show, once, with its day, rating, pin and words', async () => {
    await film('Spirited Away', { rating: 7, text: 'The train.' }); await film('Up', { current: true });
    await writeHandovers(db, idb); await writeHandovers(db, idb);
    const cards = (await cardsFor('media', 'logbook.handover', idb)).map(parseCard);
    expect(cards).toHaveLength(2); expect(cards.every(Boolean)).toBe(true);
    expect(cards.map(c => (c!.data as { title: string }).title).sort()).toEqual(['Spirited Away', 'Up']);
    expect(cards.find(c => (c!.data as { title: string }).title === 'Spirited Away')!.data).toMatchObject({ day: '2026-09-14', media: 'Film', rating: 7, current: false, text: 'The train.' });
  });
  it('waits until every entry has a receipt from Media', async () => {
    await film('A'); await film('B');
    const [a, b] = await mediaEntries();
    expect(await handoverState(db, idb)).toMatchObject({ total: 2, received: 0, ready: false });
    await putCards([receipt(a.uid!)], idb);
    expect(await handoverState(db, idb)).toMatchObject({ total: 2, received: 1, ready: false });
    await putCards([receipt(b.uid!)], idb);
    expect(await handoverState(db, idb)).toMatchObject({ total: 2, received: 2, ready: true });
  });
  it('the backup holds every moved entry, as JSON', async () => {
    await film('A', { text: 'kept words' });
    const blob = movedBackup(await mediaEntries(), new Date('2026-10-04T10:00:00'));
    const data = JSON.parse(await blob.text());
    expect(data).toMatchObject({ format: 'logbook-media-handover', version: 1 }); expect(data.entries[0]).toMatchObject({ text: 'kept words', data: { title: 'A' } });
  });
  it('lets go only of entries Media has received, and tidies its own cards; other entries are untouched', async () => {
    await film('A'); await film('B');
    await keepEntry(db, { kind: 'quote', text: 'Be kind.', at: new Date(), data: { kind: 'quote', who: 'Overheard' } });
    await writeHandovers(db, idb);
    const [a] = await mediaEntries();
    await putCards([receipt(a.uid!)], idb);
    await letGo(db, idb);
    expect((await mediaEntries()).map(e => (e.data as { title: string }).title)).toEqual(['B']);
    expect(await db.entries.where('kind').equals('quote').count()).toBe(1);
    expect((await cardsFor('media', 'logbook.handover', idb)).map(c => (c as Card).id)).toEqual([`logbook.handover:${(await mediaEntries())[0].uid}`]);
  });
});
