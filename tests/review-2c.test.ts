import { describe, expect, it } from 'vitest';
import { maskMoments, visibleTags } from '../src/domain/looking';
import { privacyState } from '../src/ui/Privacy';
import { stepPick } from '../src/screens/calendar/Year';

const e = (id: number, x: object) => ({ id, day: '2026-09-29', at: 0, tz: 'UTC', kind: 'line', text: 't', marks: {}, tags: [], people: [], writtenAt: 0, ...x }) as never;
const m = (id: number, entryId: number | undefined, word: string) => ({ id, day: '2026-09-29', at: 0, word, family: 'low', strength: 3, about: 'then lonely', ...(entryId ? { entryId } : {}) }) as never;
describe('private feelings and tags stay closed while locked', () => {
  it('a private line’s feeling keeps its form but not its words', () => {
    const ms = maskMoments([m(1, 7, 'ashamed'), m(2, 8, 'calm'), m(3, undefined, 'tired')], [e(7, { marks: { priv: true } }), e(8, {})], true);
    expect(ms.map(x => [x.word, x.about, x.family])).toEqual([['a private feeling', undefined, 'low'], ['calm', 'then lonely', 'low'], ['tired', 'then lonely', 'low']]);
    expect(maskMoments([m(1, 7, 'ashamed')], [e(7, { marks: { priv: true } })], false)[0].word).toBe('ashamed');
  });
  it('a tag used only on private lines is hidden while locked; a shared one stays', () => {
    const es = [e(1, { tags: ['secret', 'walk'], marks: { priv: true } }), e(2, { tags: ['walk'] })];
    expect(visibleTags(['secret', 'walk', 'unused'], es, true)).toEqual(['walk', 'unused']);
    expect(visibleTags(['secret', 'walk'], es, false)).toEqual(['secret', 'walk']);
  });
});
describe('the lock state', () => {
  it('is closed while settings load, open only after an unlock, and a new lock starts closed', () => {
    expect(privacyState(undefined, null)).toEqual({ enabled: true, locked: true });
    expect(privacyState(null, null)).toEqual({ enabled: false, locked: false });
    expect(privacyState({ credentialId: 'A', createdAt: 0 }, null)).toEqual({ enabled: true, locked: true });
    expect(privacyState({ credentialId: 'A', createdAt: 0 }, { at: 1, credentialId: 'A' })).toEqual({ enabled: true, locked: false });
    expect(privacyState({ credentialId: 'B', createdAt: 0 }, { at: 1, credentialId: 'A' })).toEqual({ enabled: true, locked: true });
  });
});
describe('year keys', () => {
  it('the first key picks the starting day; then days and weeks on the ring, clamped to the year', () => {
    expect(stepPick(null, 'ArrowRight', 'ring', 365, 271)).toBe(271);
    expect(stepPick(0, 'ArrowLeft', 'ring', 365, 0)).toBe(0); expect(stepPick(364, 'ArrowRight', 'ring', 365, 0)).toBe(364);
    expect(stepPick(10, 'ArrowDown', 'ring', 365, 0)).toBe(17); expect(stepPick(10, 'x', 'ring', 365, 0)).toBeNull();
  });
  it('on the pixels grid, up and down move a day and left and right a month', () => {
    expect(stepPick(40, 'ArrowDown', 'pixels', 365, 0, 2026)).toBe(41);
    expect(stepPick(40, 'ArrowRight', 'pixels', 365, 0, 2026)).toBe(68); // 10 Feb → 10 Mar
    expect(stepPick(30, 'ArrowRight', 'pixels', 365, 0, 2026)).toBe(58); // 31 Jan → 28 Feb (clamped to the month)
  });
});
