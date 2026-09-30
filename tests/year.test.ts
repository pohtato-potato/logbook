import { describe, expect, it } from 'vitest';
import { pixelHit, ringGeom, ringHit, drawYearRing, drawYearPixels } from '../src/draw/year';
import { yearDays } from '../src/domain/looking';
import { lookOf } from '../src/draw/forms';

const days = yearDays(2026, new Map());
function cell(mo: number, d: number): [number, number] { const top = 22, left = 30, cw = (360 - left - 2) / 12, ch = (420 - top - 2) / 31; return [left + mo * cw + cw / 2, top + d * ch + ch / 2]; }
describe('year hit-testing', () => {
  it('a tap on a day’s spoke finds that day, and the middle or outside finds nothing', () => {
    const g = ringGeom(400, 400, days);
    for (const i of [0, 100, 364]) { const a = g.angOf(i), r = g.R0 + g.L / 2; expect(ringHit(g.cx + Math.cos(a) * r, g.cy + Math.sin(a) * r, 400, 400, days)).toBe(i); }
    expect(ringHit(200, 200, 400, 400, days)).toBe(-1); expect(ringHit(2, 2, 400, 400, days)).toBe(-1);
  });
  it('pixels: 31 February is nothing, and 29 February exists only in leap years', () => {
    expect(pixelHit(...cell(1, 30), 360, 420, 2026)).toBe(-1);
    expect(pixelHit(...cell(1, 28), 360, 420, 2026)).toBe(-1); expect(pixelHit(...cell(1, 28), 360, 420, 2028)).toBe(59);
    expect(pixelHit(...cell(0, 0), 360, 420, 2026)).toBe(0); expect(pixelHit(...cell(11, 30), 360, 420, 2026)).toBe(364);
    expect(pixelHit(5, 5, 360, 420, 2026)).toBe(-1);
  });
  it('both drawings run on an empty year and a leap year without errors', () => {
    const ctx = new Proxy({}, { get: (_, k) => (k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'measureText' ? () => ({ width: 10 }) : (...a: number[]) => { if (a.some(v => typeof v === 'number' && !Number.isFinite(v))) throw new Error('bad ' + String(k)); }), set: () => true }) as unknown as CanvasRenderingContext2D;
    for (const ds of [days, yearDays(2028, new Map([['2028-02-29', { family: 'warm', count: 3 }]]))]) { drawYearRing(ctx, lookOf('dark'), 360, 360, ds, 10, 59); drawYearPixels(ctx, lookOf('light'), 360, 420, ds, -1, -1); }
  });
});
