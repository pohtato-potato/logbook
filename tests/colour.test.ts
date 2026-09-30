import { describe, expect, it } from 'vitest';
import { FAMILIES } from '../src/vocab/vocab';
import { GROUND, LUMINOUS, PIGMENT, contrast, inkOf, mixOk, onColor, palette, solid, tagFamily } from '../src/domain/colour';

describe('colour rules', () => {
  it('text on every feeling colour passes 4.5:1 once filled with solid()', () => {
    for (const P of [LUMINOUS, PIGMENT]) for (const f of FAMILIES) {
      const fill = solid(P[f]);
      expect(contrast(fill, onColor(fill))).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('solid() leaves colours alone when they already pass', () => expect(solid('#FFC83D')).toBe('#ffc83d'));
  it('a colour used as text reaches 4.5:1 on both grounds', () => {
    for (const f of FAMILIES) {
      expect(contrast(inkOf(palette('dark')[f], GROUND.dark.base, true), GROUND.dark.base)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(inkOf(palette('light')[f], GROUND.light.base, false), GROUND.light.base)).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('mixes pink and yellow into a vivid colour, not grey', () => {
    const m = mixOk(['#FF8FAE', '#FFC83D'], [1, 1]);
    const [r, g, b] = [1, 3, 5].map(i => parseInt(m.slice(i, i + 2), 16));
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeGreaterThan(80);
  });
  it('a tag takes the feeling it most often comes with, or today’s when it has none', () => {
    expect(tagFamily('walk', { walk: ['warm', 'warm', 'bright'] }, 'calm')).toBe('warm');
    expect(tagFamily('new', {}, 'calm')).toBe('calm');
  });
});
