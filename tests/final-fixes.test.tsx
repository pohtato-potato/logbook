import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { initPwa, pwaState, UpdateNoticeView } from '../src/pwa';

describe('C1: Logbook works offline', () => {
  it('the service worker is registered at start, and a new version is offered, not forced', async () => {
    let opts: { onNeedRefresh?: () => void } = {};
    await initPwa(async () => o => { opts = o; return async () => {}; }, true);
    expect(opts.onNeedRefresh).toBeTypeOf('function');
    opts.onNeedRefresh!(); expect(pwaState().needRefresh).toBe(true);
    expect(readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8')).toMatch(/initPwa\(\)/);
  });
  it('the update notice says so plainly, with a large button', () => {
    const html = renderToStaticMarkup(<UpdateNoticeView onUpdate={() => {}} />);
    expect(html).toContain('A new version of Logbook is ready.'); expect(html).toContain('Update');
  });
});

import { maskPrivate, maskMoments, openTo, PRIVATE_FEELING, PRIVATE_TEXT, wordCounts } from '../src/domain/looking';
import { entryLine, EMPTY_LOOKUP } from '../src/domain/entryText';
import { echoesOf } from '../src/screens/DayPage';
import type { Entry, Moment } from '../src/db/types';
const base = { at: 0, tz: 'UTC', text: '', tags: [], people: [], writtenAt: 0 };
describe('C2, I10, I11, M1: nothing private shows while locked', () => {
  const link: Entry = { ...base, id: 1, day: '2026-09-01', kind: 'link', marks: { priv: true, first: true }, people: ['R'], data: { kind: 'link', url: 'https://secret.example/a', title: 'The secret article' } };
  const place: Entry = { ...base, id: 2, day: '2026-09-01', kind: 'place', marks: { priv: true }, data: { kind: 'place', placeId: 1, first: false } };
  const saw: Entry = { ...base, id: 3, day: '2026-09-01', kind: 'person', marks: { priv: true }, people: ['R'], data: { kind: 'person', how: 'In person', who: ['R'] } };
  it('a private link, place or meeting says only that it is private, and keeps no people', () => {
    const lk = { ...EMPTY_LOOKUP, places: new Map([[1, { id: 1, name: 'Secret café', first: false, visits: 1 }]]) };
    for (const e of maskPrivate([link, place, saw], true)) { const s = entryLine(e, lk); expect(s).toBe(PRIVATE_TEXT); expect(e.people).toEqual([]); expect(JSON.stringify(e)).not.toMatch(/secret|Secret|"R"/); }
  });
  it('people from private lines are left out of counts while locked', () => {
    expect(openTo([link, { ...link, id: 9, marks: {} }], true).map(e => e.id)).toEqual([9]);
    expect(openTo([link], false).length).toBe(1);
  });
  it('echoes never point at a private line while locked', () => {
    const open: Entry = { ...base, id: 5, day: '2026-10-02', kind: 'line', marks: {} }, hid: Entry = { ...base, id: 6, day: '2026-09-14', kind: 'line', marks: { priv: true } };
    const now: Moment = { id: 50, day: '2026-10-02', at: 0, word: 'lonely', family: 'low', entryId: 5 } as Moment, then: Moment = { id: 60, day: '2026-09-14', at: 0, word: 'lonely', family: 'low', entryId: 6 } as Moment;
    expect(echoesOf([now], [now, then], [open, hid], true).size).toBe(0);
    expect(echoesOf([now], [now, then], [open, hid], false).size).toBe(1);
    expect(wordCounts(maskMoments([then, { ...then, id: 61 }], [hid], true)).map(w => w[0])).not.toContain(PRIVATE_FEELING);
  });
});

import { onThisDay, yearReport } from '../src/domain/almanac';
import { wrappedCards } from '../src/draw/cards';
describe('I9 and the Timeline ruling: looking back names real places, and counts only days the owner kept', () => {
  const lk = { ...EMPTY_LOOKUP, places: new Map([[1, { id: 1, name: 'Blue Tokai', first: true, visits: 1 }]]) };
  const cafe: Entry = { ...base, id: 1, day: '2026-09-03', kind: 'place', marks: { first: true }, data: { kind: 'place', placeId: 1, first: true } };
  const visit: Entry = { ...base, id: 2, day: '2026-09-04', at: 1, kind: 'place', marks: {}, source: 'timeline', data: { kind: 'place', placeId: 1, first: false } };
  it('the Report and Wrapped say the place’s name', () => {
    expect(yearReport(2026, { entries: [cafe], moments: [], rows: [], places: [], people: [], lookup: lk }).notable.at(-1)!.text).toContain('Place: Blue Tokai');
    expect(wrappedCards('2026-09', [cafe], [], [], lk).find(c => c.kind === 'firsts')!.line).toContain('Blue Tokai');
  });
  it('Timeline visits are not days kept, and never stand in for On this day', () => {
    const r = yearReport(2026, { entries: [cafe, visit], moments: [], rows: [], places: [], people: [], lookup: lk });
    expect(r.numbers.find(x => /day/.test(x.label))!.n).toBe(1);
    expect(onThisDay([visit], '2027-09-04')).toEqual([]);
  });
});
