import { beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TodayView } from '../src/screens/Today';
import { clockKey } from '../src/ui/useNow';
import { restoreDraft } from '../src/domain/line';
import { buildMonthDays, CalendarView } from '../src/screens/Calendar';
import { parseStarter, StarterError } from '../src/db/starter';
import { openDb, type LogbookDb } from '../src/db/db';
import { StorageFullError, keepLine, removeEntry, removeFeelingFromEntry, removeMoment } from '../src/db/actions';

const noop = () => {};
const base = { greeting: 'g', entries: [], moments: [], foldedOpen: false, onToggleFold: noop, onConfirmOverall: noop, onChangeOverall: noop, onOpenFeeling: noop, onEntryMenu: noop, writer: null };

describe('review fix 1: the header shows the logical day', () => {
  it('at 00:30 on 1 October, Today is still Wednesday 30 September', () => {
    const html = renderToStaticMarkup(<TodayView {...base} now={new Date('2026-10-01T00:30:00')} night={true} />);
    expect(html).toContain('Wednesday 30 September');
    expect(html).not.toContain('1 October');
  });
});
describe('review fix 2: Today notices the day and night changing', () => {
  it('the clock key changes at 4 am and at 5 am, and not in between', () => {
    expect(clockKey(new Date('2026-10-01T03:59:00'))).not.toBe(clockKey(new Date('2026-10-01T04:00:00')));
    expect(clockKey(new Date('2026-10-01T04:59:00'))).not.toBe(clockKey(new Date('2026-10-01T05:00:00')));
    expect(clockKey(new Date('2026-10-01T10:00:00'))).toBe(clockKey(new Date('2026-10-01T15:00:00')));
  });
});
describe('review fix 3: undoing a removal never deletes words typed since', () => {
  it('restores the line only if nothing was typed after the removal', () => {
    expect(restoreDraft({ before: 'felt :calm today', after: 'felt today', current: 'felt today' })).toBe('felt :calm today');
    expect(restoreDraft({ before: 'felt :calm today', after: 'felt today', current: 'felt today and more words' })).toBeNull();
  });
});
describe('review fix 4: removing reports a full phone like keeping does', () => {
  let db: LogbookDb, n = 0;
  beforeEach(async () => { db = openDb('rf-' + n++); await db.open(); });
  const full = () => Promise.reject(Object.assign(new Error('full'), { name: 'QuotaExceededError' }));
  it('removeEntry, removeMoment and removeFeelingFromEntry turn a full disk into StorageFullError', async () => {
    const r = await keepLine(db, { text: 'x :calm then :pooped', marks: {}, at: new Date('2026-09-29T22:00:00') }, {});
    const m = (await db.moments.toArray())[0];
    db.entries.delete = full as unknown as typeof db.entries.delete;
    await expect(removeEntry(db, r.entryId)).rejects.toBeInstanceOf(StorageFullError);
    db.moments.delete = full as unknown as typeof db.moments.delete;
    await expect(removeMoment(db, m.id!)).rejects.toBeInstanceOf(StorageFullError);
    db.entries.update = full as unknown as typeof db.entries.update;
    await expect(removeFeelingFromEntry(db, r.entryId, 'calm')).rejects.toBeInstanceOf(StorageFullError);
  });
});
describe('review fix 5: days with lines but no feelings still show and open', () => {
  it('builds a day from entries alone, with its first mark', () => {
    const days = buildMonthDays([], [{ day: '2026-09-12', marks: { first: true } }], []);
    expect(days['2026-09-12']).toEqual({ count: 0, first: true });
    const html = renderToStaticMarkup(<CalendarView month="2026-09" today="2026-09-29" days={days} open={null} onOpen={noop} onMonth={noop} />);
    expect(html).toContain('aria-label="12 September: lines kept, no feelings named, a first"');
    expect(html).not.toContain('Nothing kept this month yet');
  });
});
describe('review fix 6: odd starter files are refused, with nothing written', () => {
  it.each([
    ['people that is not a list', '{"format":"logbook-starter","version":1,"people":{},"homes":[]}', 'people'],
    ['homes that is not a list', '{"format":"logbook-starter","version":1,"people":[],"homes":"x"}', 'homes'],
    ['a person with no name', '{"format":"logbook-starter","version":1,"people":[{"id":"a","initial":"A"}],"homes":[]}', 'person 1 has no name'],
    ['an initial that is not text', '{"format":"logbook-starter","version":1,"people":[{"id":"a","initial":5,"name":"A"}],"homes":[]}', 'person 1 has no initial'],
    ['a thread that is not a number', '{"format":"logbook-starter","version":1,"people":[{"id":"a","initial":"A","name":"A","thread":"x"}],"homes":[]}', 'thread'],
    ['an unknown version', '{"format":"logbook-starter","version":2,"people":[],"homes":[]}', 'version'],
  ])('refuses %s', (_, text, msg) => {
    expect(() => parseStarter(text)).toThrow(StarterError);
    expect(() => parseStarter(text)).toThrow(msg);
  });
});
