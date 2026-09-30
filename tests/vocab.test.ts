import { describe, expect, it } from 'vitest';
import { ALL_WORDS, BLENDS, FAMILIES, RARE_WORDS, feelingOf, findWord, groupsOf, ladderName, searchFeelings, slangTargets } from '../src/vocab/vocab';

describe('the vocabulary', () => {
  it('has nine families and all 242 Atlas words', () => {
    expect(FAMILIES).toEqual(['bright','proud','curious','calm','warm','wistful','low','tense','heated']);
    expect(ALL_WORDS.length).toBe(242);
    expect(RARE_WORDS.length).toBe(51);
    expect(BLENDS.length).toBe(18);
  });
  it('groups words by family', () => expect(groupsOf('calm')[0].words.map(w => w.w)).toContain('calm'));
  it('finds Atlas, rare and own words', () => {
    expect(findWord('nostalgic', {})?.family).toBe('wistful');
    expect(findWord('saudade', {})?.lang).toBe('Portuguese');
    expect(findWord('glimmery', { glimmery: 'bright' })?.family).toBe('bright');
    expect(findWord('zzz', {})).toBeNull();
  });
  it('reads tokens typed in a line, including slang and hyphens', () => {
    expect(feelingOf('pooped', {})).toEqual({ w: 'pooped', family: 'low' });
    expect(feelingOf('mood-off', {})?.family).toBe('heated');
    expect(feelingOf('asdf', {})).toBeNull();
  });
  it('searches slang, typos and own words', () => {
    for (const q of ['mid', 'pooped', 'agog', 'knackered', 'udaas', 'lugubrious', 'hangry']) expect(searchFeelings(q, {}).length).toBeGreaterThan(0);
    expect(searchFeelings('nostalgik', {})[0].kind).toBe('near');
    expect(searchFeelings('glim', { glimmery: 'bright' })[0]).toMatchObject({ w: 'glimmery', kind: 'own' });
    expect(searchFeelings('', {})).toEqual([]);
  });
  it('every everyday word points at real Atlas words', () => {
    expect(slangTargets('pooped').every(w => findWord(w, {}))).toBe(true);
  });
  it('names strengths with the weather ladder', () => {
    expect(ladderName('wistful', 3)).toBe('Soft rain at dusk');
    expect(ladderName('calm', 9)).toBe(ladderName('calm', 5));
  });
});
describe('search results', () => {
  it('never lists the same word twice', () => {
    for (const q of ['calm', 'tired', 'meh', 'saudade']) { const ws = searchFeelings(q, {}).map(m => m.w); expect(new Set(ws).size).toBe(ws.length); }
  });
});
