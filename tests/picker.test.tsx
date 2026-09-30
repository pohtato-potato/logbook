import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FeelingPickerView, pinLabel } from '../src/screens/FeelingPicker';
import { FeelingCardView } from '../src/screens/FeelingCard';

const noop = () => {};
const props = { when: 'now' as const, fam: 'wistful' as const, word: 'nostalgic', strength: 3, about: '', query: '', own: {}, onWhen: noop, onFam: noop, onWord: noop, onStrength: noop, onAbout: noop, onBlend: noop, onQuery: noop, onOwnWord: noop, onKeep: noop };

describe('the save bar', () => {
  it('names what it keeps', () => expect(pinLabel(props)).toEqual({ disabled: false, label: 'Keep “nostalgic”', sub: 'Soft rain at dusk · right now' }));
  it('waits while searching, so it can never keep a hidden word', () => expect(pinLabel({ ...props, query: 'pooped' })).toMatchObject({ disabled: true, label: 'Pick a word first' }));
  it('says when it sets the day overall', () => expect(pinLabel({ ...props, when: 'day' }).sub).toBe('Soft rain at dusk · as the day overall'));
});
describe('the picker', () => {
  it('shows all nine families, the words of the chosen one and a real Now/Whole-day switch', () => {
    const html = renderToStaticMarkup(<FeelingPickerView {...props} />);
    for (const f of ['Bright', 'Proud', 'Curious', 'Calm', 'Warm', 'Wistful', 'Low', 'Tense', 'Heated']) expect(html).toContain(f);
    expect(html).toContain('nostalgic');
    expect(html).toMatch(/aria-pressed="true"[^>]*>Right now/);
  });
  it('offers everyday meanings and keeping your own word while searching', () => {
    const html = renderToStaticMarkup(<FeelingPickerView {...props} query="pooped" />);
    expect(html).toContain('exhausted');
    expect(html).toContain('Keep “pooped” itself');
    expect(renderToStaticMarkup(<FeelingPickerView {...props} query="zzqq" />)).toContain('Keep “zzqq” as your own word');
  });
});
describe('the feeling card', () => {
  it('shows the meaning, family, strength and a Remove button', () => {
    const html = renderToStaticMarkup(<FeelingCardView word="calm" family="calm" meaning="Steady; nothing pulling at you." strength={2} close={['peaceful']} canRemove where="from this line" onRemove={noop} onClose={noop} onOpenWord={noop} />);
    for (const s of ['calm', 'Calm', 'Steady; nothing pulling at you.', 'Still air', 'strength 2 of 5', 'peaceful', 'Remove from this line']) expect(html).toContain(s);
  });
});
