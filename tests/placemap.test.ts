import { describe, expect, it } from 'vitest';
import { projection, roundCoord } from '../src/domain/geo';
import { drawPlaceMap } from '../src/draw/placeMap';
import { lookOf } from '../src/draw/forms';

describe('geo', () => {
  it('rounds to about 100 m', () => expect(roundCoord(28.613939)).toBe(28.614));
  it('keeps every point inside the padding', () => {
    const pts = [{ lat: 10, lon: 20 }, { lat: 10.05, lon: 20.1 }, { lat: 9.98, lon: 19.95 }];
    const P = projection(pts, 300, 200, 20)!;
    for (const p of pts) { const q = P(p); expect(q.x).toBeGreaterThanOrEqual(20); expect(q.x).toBeLessThanOrEqual(280); expect(q.y).toBeGreaterThanOrEqual(20); expect(q.y).toBeLessThanOrEqual(180); }
  });
  it('north is up', () => { const P = projection([{ lat: 10, lon: 20 }, { lat: 10.1, lon: 20 }], 200, 200, 10)!; expect(P({ lat: 10.1, lon: 20 }).y).toBeLessThan(P({ lat: 10, lon: 20 }).y); });
  it('one point sits in the middle; no points means no projection', () => {
    const q = projection([{ lat: 10, lon: 20 }], 200, 100, 10)!({ lat: 10, lon: 20 }); expect(Math.round(q.x)).toBe(100); expect(Math.round(q.y)).toBe(50);
    expect(projection([], 200, 100, 10)).toBeNull();
  });
});
describe('the drawn map', () => {
  it('draws with places without positions, and with nothing at all, without errors or dots at 0,0', () => {
    const arcs: number[][] = [];
    const ctx = new Proxy({}, { get: (_, k) => (k === 'createRadialGradient' || k === 'createLinearGradient') ? () => ({ addColorStop() {} }) : (...a: number[]) => {
      if (a.some(v => typeof v === 'number' && !Number.isFinite(v))) throw new Error('bad ' + String(k)); if (k === 'arc') arcs.push(a); }, set: () => true }) as unknown as CanvasRenderingContext2D;
    drawPlaceMap(ctx, lookOf('dark'), 320, 240, 1, [{ id: 1, name: 'a', first: true, visits: 3, lat: 10, lon: 20 }, { id: 2, name: 'no position', first: false, visits: 1 }], [{ lat: 10.01, lon: 20.01 }]);
    drawPlaceMap(ctx, lookOf('light'), 320, 240, 1, [], []);
    expect(arcs.length).toBeGreaterThan(0); expect(arcs.some(a => a[0] === 0 && a[1] === 0)).toBe(false);
  });
});
