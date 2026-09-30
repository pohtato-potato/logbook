import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { entryLine } from '../src/domain/entryText';
import { KeptCard } from '../src/screens/KeptCard';
import type { Entry, Place, Span, Person } from '../src/db/types';

const base = { id: 1, day: '2026-09-29', at: Date.UTC(2026, 8, 29, 15, 0), tz: 'UTC', marks: {}, tags: [], people: [], writtenAt: 0 };
const lk = { places: new Map<number, Place>([[3, { id: 3, name: 'A new café', first: true, visits: 1 }]]), spans: new Map<number, Span>([[4, { id: 4, name: 'Diwali at home', from: '2026-11-06', to: '2026-11-10', family: 'warm' }]]),
  people: new Map<string, Person>([['A', { id: 'a', initial: 'A', name: 'Friend A', thread: 0 }], ['R', { id: 'r', initial: 'R', name: 'Friend R', thread: 1 }]]) };
const e = (x: Partial<Entry>) => ({ ...base, kind: 'line', text: '', ...x }) as Entry;

describe('one readable line per kind', () => {
  it.each([
    [e({ kind: 'media', text: 'Quietly wrecked me.', data: { kind: 'media', media: 'Film', title: 'Past Lives', rating: 6, current: true } }), 'Film: Past Lives, 6 of 7 · Exceptional. Quietly wrecked me. (Currently watching)'],
    [e({ kind: 'quote', text: 'We’re just early.', data: { kind: 'quote', who: 'Overheard', where: 'on the trip' } }), '“We’re just early.” (overheard, on the trip)'],
    [e({ kind: 'quote', text: 'Chai tastes better.', data: { kind: 'quote', who: 'R' } }), '“Chai tastes better.” (Friend R)'],
    [e({ kind: 'place', data: { kind: 'place', placeId: 3, first: true } }), 'Place: A new café (a first).'],
    [e({ kind: 'person', data: { kind: 'person', who: ['A', 'R'], how: 'Call' } }), 'Called Friend A and Friend R.'],
    [e({ kind: 'keep', text: 'Film ticket', data: { kind: 'keep' } }), 'Keepsake: Film ticket.'],
    [e({ kind: 'voice', data: { kind: 'voice', audio: new Blob(), seconds: 42, type: 'audio/webm' } }), 'Voice note, 0:42.'],
    [e({ kind: 'span', data: { kind: 'span', spanId: 4 } }), 'Span: Diwali at home, 6 to 10 November.'],
    [e({ kind: 'past', text: 'Graduation day.', data: { kind: 'past' } }), 'Written later: Graduation day.'],
    [e({ kind: 'line', text: 'felt :at-ease #walk' }), 'felt at ease #walk'],
  ])('%#', (entry, line) => expect(entryLine(entry, lk)).toBe(line));
  it('a missing place or span still reads, and never prints undefined', () => {
    expect(entryLine(e({ kind: 'place', data: { kind: 'place', placeId: 99, first: false } }), lk)).toBe('Place: a place that was removed.');
    expect(entryLine(e({ kind: 'span', data: { kind: 'span', spanId: 99 } }), lk)).toBe('Span: a span that was removed.');
  });
});
describe('kept cards', () => {
  it('shows a rating as a neutral pill with its words, never a feeling colour', () => {
    const html = renderToStaticMarkup(<KeptCard entry={e({ kind: 'media', text: '', data: { kind: 'media', media: 'Book', title: 'X', rating: 4, current: false } })} lookup={lk} own={{}} onOpenFeeling={() => {}} onMenu={() => {}} />);
    expect(html).toContain('4 of 7 · Average'); expect(html).toContain('class="rating"'); expect(html).not.toMatch(/--fc/);
  });
  it.each(['media', 'quote', 'place', 'person', 'keep', 'span', 'past', 'line'] as const)('a %s card renders its time and never undefined', kind => {
    const data = { media: { kind: 'media', media: 'Film', title: 'T', rating: 5, current: true }, quote: { kind: 'quote', who: 'A' }, place: { kind: 'place', placeId: 3, first: true }, person: { kind: 'person', who: ['A'], how: 'In person' }, keep: { kind: 'keep' }, span: { kind: 'span', spanId: 4 }, past: { kind: 'past' }, line: undefined }[kind];
    const html = renderToStaticMarkup(<KeptCard entry={e({ kind, text: 'words', data: data as Entry['data'] })} lookup={lk} own={{}} onOpenFeeling={() => {}} onMenu={() => {}} />);
    expect(html).toContain(kind === 'past' ? 'Written later, on' : '3:00 pm'); expect(html).not.toMatch(/undefined|NaN/);
  });
});
