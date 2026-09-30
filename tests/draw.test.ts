import { describe, expect, it } from 'vitest';
import { FAMILIES } from '../src/vocab/vocab';
import { drawForm, drawSmall, lookOf } from '../src/draw/forms';
import { drawBloomLine, drawScoreLine } from '../src/draw/day';

const grad = { addColorStop(o: number, c: string) { if (!(o >= 0 && o <= 1) || /NaN|undefined/.test(c)) throw new Error('bad stop ' + o + ' ' + c); } };
const mockCtx = () => new Proxy({} as Record<string, unknown>, {
  get(t, k) {
    if (k in t) return t[k as string];
    if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createConicGradient') return (...a: number[]) => { if (a.some(v => !Number.isFinite(v))) throw new Error('bad gradient'); return grad; };
    if (k === 'measureText') return () => ({ width: 40 });
    return (...a: unknown[]) => { if (a.some(v => typeof v === 'number' && !Number.isFinite(v))) throw new Error('bad arg to ' + String(k)); };
  },
  set(t, k, v) { if (typeof v === 'string' && /NaN|undefined/.test(v)) throw new Error('bad ' + String(k) + ' ' + v); t[k as string] = v; return true; },
}) as unknown as CanvasRenderingContext2D;

const DAY = [{ h: 9.2, family: 'tense' as const, strength: 3 }, { h: 13.5, family: 'bright' as const, second: 'tense' as const, strength: 3 }, { h: 18.7, family: 'warm' as const, strength: 4 }, { h: 23.3, family: 'wistful' as const, strength: 2 }];

describe('drawings', () => {
  for (const theme of ['dark', 'light'] as const) {
    const look = lookOf(theme);
    it(`draws every form at every size in ${theme}`, () => {
      for (const f of FAMILIES) for (const r of [6, 12, 13, 30, 60]) for (const t of [0, 2.3, 57]) { drawForm(mockCtx(), look, f, 50, 50, r, t, 'calm'); drawSmall(mockCtx(), look, f, 20, 20, r); }
    });
    it(`draws the day pages in ${theme}, including an empty day`, () => {
      for (const ms of [DAY, [], [DAY[0]]]) for (const [w, h] of [[320, 300], [48, 48]]) { drawBloomLine(mockCtx(), look, w, h, 1.5, ms, 'warm'); drawScoreLine(mockCtx(), look, w, h, 1.5, ms); }
    });
  }
  it('keeps Warm as the rings and Tense as the two arms (the approved swap)', async () => {
    const src = (await import('node:fs')).readFileSync('src/draw/forms.ts', 'utf8');
    expect(src).toMatch(/warm\(ctx[^\n]*\n[^]*?Math\.sin\(a \* f \+ t \* 7/);
    expect(src).toMatch(/tense\(ctx[^\n]*\n[^]*?for \(let arm = 0; arm < 2; arm\+\+\)/);
  });
});
