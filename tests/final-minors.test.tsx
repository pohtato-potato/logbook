import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { clockKey } from '../src/ui/useNow';
import { keyAction } from '../src/ui/keys';
import { wrappedCards } from '../src/draw/cards';
import { yearReport, randomDay } from '../src/domain/almanac';
import { PostcardView } from '../src/screens/Postcard';
import card from './fixtures/postcard-v1.json';
import type { Entry, Moment } from '../src/db/types';
import type { Postcard } from '../src/sources/shelf';

const base = { at: 0, tz: 'UTC', text: '', tags: [] as string[], people: [] as string[], writtenAt: 0, marks: {} };
const m = (id: number, day: string): Moment => ({ id, day, at: 0, word: 'calm', family: 'calm', strength: 2, entryId: id } as Moment);
describe('final minors', () => {
  it('M10: Health’s colours turn to night at 11 pm without a reload', () => expect(clockKey(new Date('2026-10-02T22:59:00'))).not.toBe(clockKey(new Date('2026-10-02T23:01:00'))));
  it('M2: Wrapped says “mostly on #tag days” only when it is true', () => {
    const es: Entry[] = Array.from({ length: 10 }, (_, i) => ({ ...base, id: i + 1, day: `2026-09-${String(i + 1).padStart(2, '0')}`, kind: 'line', tags: i === 0 ? ['walk'] : [] } as Entry));
    const line = wrappedCards('2026-09', es, es.map(e => m(e.id!, e.day)))[0].line;
    expect(line).not.toContain('#walk'); expect(line).toBe('10 calm moments, most of them early in the month.');
    expect(wrappedCards('2026-09', es.slice(0, 1), [m(1, '2026-09-01')])[0].line).toBe('1 calm moment, early in the month.');
  });
  it('M7: the Report never says “0 moments”, and a tie names no weekday', () => {
    const r = yearReport(2026, { entries: [{ ...base, id: 1, day: '2026-09-01', kind: 'line', people: ['R'] } as Entry, { ...base, id: 2, day: '2026-09-02', kind: 'line', people: ['R'] } as Entry, { ...base, id: 3, day: '2026-09-03', kind: 'line', people: ['R'] } as Entry], moments: [], rows: [], places: [], people: [] });
    expect(r.numbers.find(x => /day/.test(x.label))!.sub).toBe(''); expect(r.numbers.find(x => /person/.test(x.label))!.sub).toBe('3 days with R');
  });
  it('M7: Another day never lands on the same day again', () => expect(randomDay(['a', 'b'], () => 0, new Set(), 'a')).toBe('b'));
  it('M21: the postcard never says “60 m”', () => expect(renderToStaticMarkup(<PostcardView card={{ ...(card as Postcard), sleepMin: 479.6 }} night={false} />)).toContain('8 h 0 m'));
  it('M5: big numbers ask for the font that is loaded', () => {
    for (const f of ['src/styles/app.css', 'src/styles/app-2c.css', 'src/styles/app-3b.css', 'src/styles/app-desk.css', 'src/draw/cards.ts']) expect(readFileSync(new URL('../' + f, import.meta.url), 'utf8')).not.toMatch(/["']Archivo["']/);
  });
  it('M3: keys do nothing under an open dialog, and a held key doesn’t repeat', () => {
    const t = { tagName: 'BODY' };
    expect(keyAction({ key: '/', target: t }, null).action).toBe('search');
    expect(keyAction({ key: '/', target: t, modal: true }, null).action).toBeUndefined();
    expect(keyAction({ key: 'ArrowLeft', target: t, repeat: true }, null).action).toBeUndefined();
    expect(keyAction({ key: 'Escape', target: t, modal: true }, null).action).toBe('close');
  });
});
