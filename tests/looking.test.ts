import { describe, expect, it } from 'vitest';
import { dayFamilies, hourMix, hourSummary, lifeItems, monthStats, monthSummary, oftenWith, peopleWith, wordCounts, yearDays, yearSummary } from '../src/domain/looking';

const m = (day: string, hhmm: string, word: string, family: string, about?: string) => ({ id: Math.random(), day, at: new Date(`${day}T${hhmm}:00`).getTime(), word, family, strength: 3, ...(about ? { about } : {}) }) as never;
const e = (day: string, x: object) => ({ id: Math.random(), day, at: 0, tz: 'UTC', kind: 'line', text: 't', marks: {}, tags: [], people: [], writtenAt: 0, ...x }) as never;
const lk = { places: new Map(), spans: new Map(), people: new Map() };
const F = (o: Record<string, string>) => new Map(Object.entries(o).map(([d, f]) => [d, { family: f as never, count: 1 }]));
describe('looking back', () => {
  it('each day has a family: the set overall wins over the suggestion', () => {
    const f = dayFamilies([m('2026-09-01', '09:00', 'calm', 'calm'), m('2026-09-01', '10:00', 'calm', 'calm')], [{ day: '2026-09-01', overall: { word: 'warm', family: 'warm', strength: 3, set: true } }]);
    expect(f.get('2026-09-01')).toEqual({ family: 'warm', count: 2 });
  });
  it('a year has every day, leap years too', () => { expect(yearDays(2028, new Map()).length).toBe(366); expect(yearDays(2026, new Map()).length).toBe(365); expect(yearDays(2026, new Map())[0]).toEqual({ day: '2026-01-01', v: 0 }); });
  it('the month in words, and nothing when empty', () => {
    expect(monthSummary(monthStats('2026-09', [m('2026-09-01', '09:00', 'a', 'warm'), m('2026-09-02', '09:00', 'b', 'warm'), m('2026-09-03', '09:00', 'c', 'calm')]))).toBe('Mostly warm and calm this month.');
    expect(monthSummary(monthStats('2026-09', [m('2026-09-01', '09:00', 'a', 'warm'), m('2026-09-02', '09:00', 'b', 'warm'), m('2026-09-03', '09:00', 'c', 'warm'), m('2026-09-04', '09:00', 'c', 'calm')]))).toBe('Mostly warm this month.');
    expect(monthSummary(monthStats('2026-09', []))).toBe('Nothing felt yet this month.');
    expect(monthStats('2026-09', [m('2026-08-01', '09:00', 'a', 'warm')]).total).toBe(0);
  });
  it('words reached for include the ones after "then"', () => expect(wordCounts([m('2026-09-01', '09:00', 'calm', 'calm', 'then tired, calm')]).slice(0, 2)).toEqual([['calm', { family: 'calm', n: 2 }], ['tired', { family: 'low', n: 1 }]]));
  it('a 1:30 am moment sits at hour 1 on the clock', () => { const h = hourMix([m('2026-09-02', '01:30', 'x', 'wistful')]); expect(h[1]).toEqual({ hour: 1, count: 1, parts: [['wistful', 1]] }); expect(h.length).toBe(24); });
  it('too few moments: says so instead of a pattern; enough: names each part of the day', () => {
    expect(hourSummary(hourMix([m('2026-09-02', '09:30', 'x', 'tense')]))).toBe('Too few moments yet to see a pattern through the day.');
    const ms = [...[1, 2, 3].map(d => m(`2026-09-0${d}`, '08:00', 'x', 'tense')), ...[1, 2, 3].map(d => m(`2026-09-0${d}`, '19:00', 'y', 'warm'))];
    expect(hourSummary(hourMix(ms))).toBe('Tense in the mornings, warm in the evenings.');
  });
  it('often together needs two days, and says the families', () => {
    expect(oftenWith([e('2026-09-01', { tags: ['walk'] }), e('2026-09-02', { tags: ['walk'] }), e('2026-09-02', { tags: ['once'] })], F({ '2026-09-01': 'warm', '2026-09-02': 'warm' }))).toEqual([{ tag: 'walk', families: ['warm'] }]);
    expect(oftenWith([], new Map())).toEqual([]);
  });
  it('who you were with: the same, by person', () => {
    const R = { id: 'r', initial: 'R', name: 'Friend R', thread: 1 };
    expect(peopleWith([e('2026-09-01', { people: ['R'] }), e('2026-09-02', { people: ['R'] })], F({ '2026-09-01': 'bright', '2026-09-02': 'warm' }), [R])).toEqual([{ person: R, families: ['bright', 'warm'] }]);
  });
  it('the year in words', () => {
    expect(yearSummary(yearDays(2026, new Map()))).toBe('Nothing kept in 2026 yet.');
    expect(yearSummary(yearDays(2026, F({ '2026-02-01': 'calm', '2026-08-01': 'warm', '2026-08-02': 'warm' })))).toBe('3 days kept in 2026, mostly warm.');
  });
  it('life: newest first, "written later" kept, "don’t bring back" left out, private hidden when locked', () => {
    const items = lifeItems([e('2019-06-14', { kind: 'past', text: 'Graduation', data: { kind: 'past' } }), e('2026-09-21', { text: 'first chai', marks: { first: true } }), e('2024-01-01', { text: 'secret', marks: { first: true, priv: true } }), e('2023-01-01', { text: 'gone', marks: { first: true, quiet: true } })],
      [], [{ name: 'Home 2', lat: 0, lon: 0, from: '2025-07-01' }], lk, true);
    expect(items.map(i => i.text)).toEqual(['first chai', 'Moved to Home 2', 'A private entry. Unlock to read.', 'Graduation']);
    expect(items[3]).toMatchObject({ year: 2019, later: true });
  });
  it('life: spans carry their dates', () => expect(lifeItems([], [{ id: 1, name: 'Trip', from: '2026-09-17', to: '2026-09-21', family: 'curious' }], [], lk, false)[0]).toMatchObject({ text: 'Trip, 17 to 21 September', span: { name: 'Trip' } }));
});
