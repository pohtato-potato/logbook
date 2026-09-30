import { describe, expect, it } from 'vitest';
import { wrappedCards, drawCard, cardColours } from '../src/draw/cards';
import { FAMILIES } from '../src/vocab/vocab';
import { lookOf } from '../src/draw/forms';
import { contrast } from '../src/domain/colour';

const e = (id: number, day: string, x: object = {}) => ({ id, day, at: 0, tz: 'UTC', kind: 'line', text: `first thing ${id}`, marks: {}, tags: [], people: [], writtenAt: 0, ...x }) as never;
const m = (id: number, day: string, word: string, family: string, entryId?: number) => ({ id, day, at: 0, word, family, strength: 3, ...(entryId ? { entryId } : {}) }) as never;
describe('wrapped', () => {
  it('only cards with real data, and never from "don’t bring back"', () => {
    const cards = wrappedCards('2026-09', [e(1, '2026-09-02', { marks: { first: true } }), e(2, '2026-09-03', { marks: { first: true, quiet: true } })], [m(1, '2026-09-02', 'calm', 'calm'), m(2, '2026-09-03', 'calm', 'calm', 2)]);
    expect(cards.map(c => c.kind)).toEqual(['mostly', 'firsts', 'words']); expect(cards[1].big).toBe('1'); expect(JSON.stringify(cards)).not.toContain('first thing 2');
    expect(wrappedCards('2026-09', [], [])).toEqual([]);
  });
  it('card text always reads against both ends of its background', () => {
    for (const theme of ['dark', 'light'] as const) for (const x of FAMILIES) for (const y of FAMILIES) {
      const c = cardColours(lookOf(theme), [x, y]); expect(contrast(c.text, c.from)).toBeGreaterThanOrEqual(4.5); expect(contrast(c.text, c.to)).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('draws without errors', () => {
    const ctx = new Proxy({}, { get: (_, k) => (k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'measureText' ? () => ({ width: 40 }) : () => {}), set: () => true }) as unknown as CanvasRenderingContext2D;
    drawCard(ctx, lookOf('dark'), 1080, 1350, { kind: 'firsts', title: 'Firsts', big: '6', line: 'A new café, a lake, the best chai of your life, and three more.', families: ['calm', 'curious'] });
  });
  it('the together card names the person', () => expect(wrappedCards('2026-09', [e(1, '2026-09-02', { people: ['R'] })], [], [{ id: 'r', initial: 'R', name: 'Friend R', thread: 0 }]).find(c => c.kind === 'people')?.big).toBe('Friend R'));
});

