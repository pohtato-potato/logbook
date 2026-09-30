import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { searchAll } from '../src/domain/search';
import { SearchView } from '../src/screens/Search';

const lk = { places: new Map(), spans: new Map(), people: new Map() };
const e = (id: number, day: string, text: string, x: object = {}) => ({ id, day, at: id, tz: 'UTC', kind: 'line', text, marks: {}, tags: [], people: [], writtenAt: 0, ...x });
const d = { entries: [e(1, '2026-09-01', 'first #rain on the metro'), e(2, '2026-09-21', 'best chai of my life'), e(3, '2026-09-27', '', { kind: 'media', data: { kind: 'media', media: 'Film', title: 'Past Lives', rating: 6, current: false } })] as never,
  tags: ['rain', 'chai', 'metro'], people: [{ id: 'r', initial: 'R', name: 'Friend R', thread: 1 }], own: {}, lookup: lk };
describe('search', () => {
  it('finds lines of every kind, newest first', () => {
    expect(searchAll('past lives', d).lines.map(l => l.id)).toEqual([3]);
    expect(searchAll('the', d).lines.map(l => l.id)).toEqual([1]);
    expect(searchAll('e', d).lines.map(l => l.id)).toEqual([3, 2, 1]);
  });
  it('#x looks at tags only, @x at people only', () => {
    expect(searchAll('#ch', d)).toMatchObject({ tags: ['chai'], lines: [], people: [] });
    expect(searchAll('@r', d).people.map(p => p.name)).toEqual(['Friend R']);
  });
  it('feelings come from the whole vocabulary', () => expect(searchAll('pooped', d).feelings[0].w).toBe('pooped'));
  it('nothing for an empty query', () => expect(searchAll('  ', d)).toEqual({ lines: [], tags: [], people: [], feelings: [] }));
  it('the screen announces results and says plainly when nothing matches', () => {
    const none = renderToStaticMarkup(<SearchView q="zzz" results={searchAll('zzz', d)} lookup={lk} onQ={() => {}} />);
    expect(none).toContain('aria-live="polite"'); expect(none).toContain('Nothing matches “zzz” yet.');
    const some = renderToStaticMarkup(<SearchView q="chai" results={searchAll('chai', d)} lookup={lk} onQ={() => {}} />);
    expect(some).toContain('21 September 2026'); expect(some).toContain('aria-label="Search"');
  });
});
