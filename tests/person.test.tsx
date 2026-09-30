import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { togetherStats } from '../src/domain/people';
import { PersonView } from '../src/screens/Person';
import { TagView } from '../src/screens/TagPage';

const e = (day: string, x: object) => ({ id: Math.round(Math.random() * 1e9), day, at: 0, tz: 'UTC', kind: 'line', text: '', marks: {}, tags: [], people: [], writtenAt: 0, ...x });
const lk = { places: new Map(), spans: new Map(), people: new Map() };
const R = { id: 'r', initial: 'R', name: 'Friend R', thread: 1, birthday: '08-21' };
describe('time together', () => {
  it('counts days, not entries, and finds the last one', () => {
    const s = togetherStats('R', [e('2026-09-14', { people: ['R'] }), e('2026-09-14', { kind: 'person', people: ['R'] }), e('2026-08-02', { people: ['R'] }), e('2025-12-01', { people: ['R'] }), e('2026-09-20', { people: ['A'] })] as never, 2026);
    expect(s.days).toBe(2); expect(s.last).toBe('2026-09-14'); expect(s.byMonth[8]).toBe(1); expect(s.byMonth[7]).toBe(1);
  });
});
describe('person page', () => {
  it('describes time together and never judges', () => {
    const html = renderToStaticMarkup(<PersonView person={R} stats={{ days: 12, last: '2026-09-14', byMonth: Array(12).fill(1) }} year={2026} entries={[]} lookup={lk} filter="all" onFilter={() => {}} onThread={() => {}} />);
    expect(html).toContain('Together 12 days this year'); expect(html).toContain('Last together on 14 September'); expect(html).toContain('Birthday on 21 August');
    expect(html).not.toMatch(/usually|days ago/);
    expect(html).toMatch(/role="img" aria-label="Days together each month in 2026: January 1, February 1/);
  });
  it('with no time together yet, says so kindly', () => expect(renderToStaticMarkup(<PersonView person={{ ...R, birthday: undefined }} stats={{ days: 0, byMonth: Array(12).fill(0) }} year={2026} entries={[]} lookup={lk} filter="all" onFilter={() => {}} onThread={() => {}} />)).toContain('No days together kept yet this year'));
});
describe('tag page', () => {
  it('explains where the colour comes from, and marks the days in words', () => {
    const html = renderToStaticMarkup(<TagView tag="walk" family="warm" fromHistory={true} entries={[e('2026-09-03', { tags: ['walk'], text: 'long #walk' })] as never} dayFamily={{ '2026-09-03': 'warm' }} lookup={lk} month="2026-09" />);
    expect(html).toContain('the feeling it most often comes with'); expect(html).toContain('1 entry'); expect(html).toMatch(/aria-label="Days in September with this tag: 3"/);
  });
  it('a new tag borrows today’s feeling until it has a history', () => expect(renderToStaticMarkup(<TagView tag="new" family="calm" fromHistory={false} entries={[]} dayFamily={{}} lookup={lk} month="2026-09" />)).toContain('today’s feeling, until it has a history'));
});
