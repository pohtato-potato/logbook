import { describe, expect, it } from 'vitest';
import { echoFor, monthLines, onThisDay, randomDay, thenAndNow, weekLineSuggestion, weekOf, yearReport } from '../src/domain/almanac';

const e = (id: number, day: string, x: object = {}) => ({ id, day, at: new Date(day + 'T12:00:00').getTime(), tz: 'UTC', kind: 'line', text: `line ${id}`, marks: {}, tags: [], people: [], writtenAt: 0, ...x }) as never;
const m = (id: number, day: string, word: string, family: string, entryId?: number) => ({ id, day, at: new Date(day + 'T12:00:00').getTime(), word, family, strength: 3, ...(entryId ? { entryId } : {}) }) as never;
describe('the report', () => {
  it('a sparse year says only what it knows, with no zero numbers', () => {
    const r = yearReport(2026, { entries: [e(1, '2026-09-01')], moments: [m(1, '2026-09-01', 'calm', 'calm')], rows: [], places: [], people: [] });
    expect(r.headline).toBe('A calm year so far.'); expect(r.numbers.map(x => x.label)).toEqual(['feelings named', 'day kept']); expect(JSON.stringify(r)).not.toMatch(/NaN|undefined| 0 /);
  });
  it('an empty year', () => expect(yearReport(2026, { entries: [], moments: [], rows: [], places: [], people: [] })).toEqual({ headline: 'Nothing kept this year yet.', numbers: [], notable: [] }));
  it('headline names where the second feeling peaked', () => {
    const ms = [...[1, 2, 3, 4].map(i => m(i, `2026-0${i}-10`, 'warm', 'warm')), m(9, '2026-05-02', 'tense', 'tense'), m(10, '2026-05-03', 'tense', 'tense')];
    expect(yearReport(2026, { entries: [], moments: ms, rows: [], places: [], people: [] }).headline).toBe('A warm year, with tense in May.');
  });
});
describe('weeks, days and echoes', () => {
  it('weeks run Monday to Sunday', () => { expect(weekOf('2026-09-27')).toEqual({ start: '2026-09-21', end: '2026-09-27' }); expect(weekOf('2026-09-28').start).toBe('2026-09-28'); });
  it('a week in a line, or a quiet week', () => {
    expect(weekLineSuggestion([e(1, '2026-09-22', { tags: ['walk'], people: ['R'] })], [m(1, '2026-09-22', 'calm', 'calm')], weekOf('2026-09-22'))).toBe('Mostly calm, with #walk and R.');
    expect(weekLineSuggestion([], [], weekOf('2026-09-22'))).toBe('A quiet week.');
  });
  it('on this day: earlier years only, one each, never "don’t bring back", and 29 February only on 29 February', () => {
    const es = [e(1, '2025-09-29'), e(2, '2025-09-29'), e(3, '2024-09-29', { marks: { quiet: true } }), e(4, '2026-09-29'), e(5, '2024-02-29')];
    expect(onThisDay(es, '2026-09-29').map(x => [x.year, x.entry.id])).toEqual([[2025, 1]]);
    expect(onThisDay(es, '2028-02-29').map(x => x.year)).toEqual([2024]); expect(onThisDay(es, '2027-02-28')).toEqual([]);
  });
  it('then and now skips years without the date', () => expect(thenAndNow([e(5, '2024-02-29'), e(6, '2028-02-29')], '2028-02-29')).toMatchObject({ then: { year: 2024 }, now: { id: 6 } }));
  it('a random day is never a "don’t bring back" day', () => { for (let i = 0; i < 20; i++) expect(randomDay(['a', 'b'], () => i / 20, new Set(['a']))).toBe('b'); expect(randomDay(['a'], Math.random, new Set(['a']))).toBeNull(); });
  it('an echo finds the latest earlier day with the same word, skipping quiet lines', () => {
    const ms = [m(1, '2026-03-14', 'wistful', 'wistful'), m(2, '2026-05-01', 'wistful', 'wistful', 9), m(3, '2026-09-29', 'wistful', 'wistful')];
    expect(echoFor(ms[2], ms, [e(9, '2026-05-01', { marks: { quiet: true } })])).toEqual({ day: '2026-03-14', word: 'wistful' });
    expect(echoFor(ms[0], ms, [])).toBeNull();
  });
  it('the year in twelve lines, newest first, saying so when empty', () => {
    const lines = monthLines(2026, [e(1, '2026-09-01', { marks: { first: true }, tags: ['walk'] })], [m(1, '2026-09-01', 'calm', 'calm')], '2026-09-29');
    expect(lines[0]).toMatchObject({ month: 'September', line: 'Mostly calm. 1 first, #walk most.' }); expect(lines[1]).toMatchObject({ month: 'August', line: 'Nothing kept.' }); expect(lines.length).toBe(9);
  });
});
