import { describe, expect, it } from 'vitest';
import { feelingsOf, momentFromLine, peopleOf, removeFeelingToken, tagsOf, tokenAt, tokenize } from '../src/domain/line';

const LINE = 'Long #walk with @r, felt :calm then :pooped at 5:30. #Chai :asdf';

describe('reading a line', () => {
  it('finds tags, people and feelings, but not times', () => {
    expect(tokenize(LINE).map(t => t.kind + ':' + t.value)).toEqual(['tag:walk', 'person:R', 'feeling:calm', 'feeling:pooped', 'tag:chai', 'feeling:asdf']);
    expect(tagsOf(LINE)).toEqual(['walk', 'chai']);
    expect(peopleOf(LINE)).toEqual(['R']);
  });
  it('keeps only feelings the vocabulary knows', () => {
    expect(feelingsOf(LINE, {})).toEqual([{ w: 'calm', family: 'calm' }, { w: 'pooped', family: 'low' }]);
  });
  it('finds the token under the caret', () => {
    const i = LINE.indexOf(':calm') + 2;
    expect(tokenAt(LINE, i)?.value).toBe('calm');
    expect(tokenAt(LINE, 0)).toBeNull();
  });
});

describe('feelings in a line become ONE moment', () => {
  it('leads with the first word, keeps a second family and lists the rest', () => {
    const r = momentFromLine([{ w: 'calm', family: 'calm' }, { w: 'pooped', family: 'low' }, { w: 'content', family: 'calm' }], new Set());
    expect(r.moment).toEqual({ word: 'calm', family: 'calm', second: 'low', about: 'then pooped, content', strength: 3 });
  });
  it('skips words already logged in the last hour', () => {
    const r = momentFromLine([{ w: 'calm', family: 'calm' }], new Set(['calm']));
    expect(r.moment).toBeNull();
    expect(r.skipped).toEqual(['calm']);
  });
  it('makes nothing from a line with no feelings', () => expect(momentFromLine([], new Set()).moment).toBeNull());
});

describe('removing a feeling from a line', () => {
  it('takes out the word and tidies spaces and punctuation', () => {
    expect(removeFeelingToken('Felt :calm, then :pooped.', 'calm')).toBe('Felt, then :pooped.');
    expect(removeFeelingToken('hi :calm and more', 'calm')).toBe('hi and more');
    expect(removeFeelingToken(':mood-off today', 'mood off')).toBe('today');
  });
  it('leaves the line alone when the word is not there', () => expect(removeFeelingToken('hi :calm', 'tense')).toBe('hi :calm'));
});
