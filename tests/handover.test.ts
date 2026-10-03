import { beforeEach, describe, expect, it } from 'vitest';
import { keepEntry } from '../src/db/actions';
import { openDb, type LogbookDb } from '../src/db/db';
import { handoverState, letGo, movedBackup, writeHandovers } from '../src/shelf/handover';
import { cardsFor, parseCard, putCards, type Card } from '../src/shelf/shelf';

let db: LogbookDb, idb: IDBFactory, n = 0;
beforeEach(async () => { db = openDb('ho-' + n++); await db.open(); idb = new IDBFactory(); });
const film = (title: string, over: Partial<{ rating: number; current: boolean; text: string }> = {}) =>
  keepEntry(db, { kind: 'media', text: over.text ?? '', at: new Date('2026-09-14T21:00:00'), data: { kind: 'media', media: 'Film', title, rating: over.rating ?? 6, current: over.current ?? false } });
const receipt = (e: { uid?: string; updatedAt?: number; writtenAt: number }, rev = e.updatedAt ?? e.writtenAt): Card => ({ id: `media.receipt:${e.uid}`, format: 'media.receipt', version: 1, from: 'media', to: 'logbook', about: { item: e.uid! }, writtenAt: 1, data: { uid: e.uid!, rev, workId: `lb-${e.uid}` } });
const dayCard = (day: string): Card => ({ id: `media.day:${day}`, format: 'media.day', version: 1, from: 'media', to: 'logbook', about: { day }, writtenAt: 1, data: { day, items: [], feelings: [] } });
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
    await putCards([receipt(a)], idb);
    expect(await handoverState(db, idb)).toMatchObject({ total: 2, received: 1, ready: false });
    await putCards([receipt(b)], idb);
    expect(await handoverState(db, idb)).toMatchObject({ total: 2, received: 2, ready: false }); // Media's card for the day isn't there yet
    await putCards([dayCard('2026-09-14')], idb);
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
    await putCards([receipt(a), dayCard('2026-09-14')], idb);
    await letGo(db, idb);
    expect((await mediaEntries()).map(e => (e.data as { title: string }).title)).toEqual(['B']);
    expect(await db.entries.where('kind').equals('quote').count()).toBe(1);
    expect((await cardsFor('media', 'logbook.handover', idb)).map(c => (c as Card).id)).toEqual([`logbook.handover:${(await mediaEntries())[0].uid}`]);
  });
});

describe('the hand-over never loses anything', () => {
  it('an entry edited after Media’s receipt is not let go until Media holds the new version', async () => {
    await film('A'); const [a] = await mediaEntries();
    await putCards([receipt(a), dayCard('2026-09-14')], idb);
    await db.entries.update(a.id!, { text: 'edited after it moved' });
    const [edited] = await mediaEntries();
    expect(await handoverState(db, idb)).toMatchObject({ received: 0, ready: false });
    await letGo(db, idb); expect(await mediaEntries()).toHaveLength(1);
    await putCards([receipt(edited)], idb);
    expect(await handoverState(db, idb)).toMatchObject({ received: 1, ready: true });
  });
  it('private entries stay in Logbook: they are never handed over or let go', async () => {
    await film('A'); await keepEntry(db, { kind: 'media', text: 'secret', marks: { priv: true }, at: new Date('2026-09-14T21:00:00'), data: { kind: 'media', media: 'Film', title: 'Private one', rating: 5, current: false } });
    await writeHandovers(db, idb);
    expect((await cardsFor('media', 'logbook.handover', idb)).map(c => ((c as Card).data as { title: string }).title)).toEqual(['A']);
    expect(await handoverState(db, idb)).toMatchObject({ total: 1, private: 1 });
  });
  it('letting go can be undone in one step', async () => {
    await film('A'); await film('B'); const es = await mediaEntries();
    await putCards([...es.map(e => receipt(e)), dayCard('2026-09-14')], idb);
    const { undo } = await letGo(db, idb);
    expect(await mediaEntries()).toHaveLength(0);
    await undo.run(); expect(await mediaEntries()).toHaveLength(2);
  });
});
