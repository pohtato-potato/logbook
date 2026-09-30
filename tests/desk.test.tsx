import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { keyAction } from '../src/ui/keys';
import { DeskView } from '../src/screens/Desk';

const body = { tagName: 'BODY' }, box = { tagName: 'TEXTAREA' };
describe('laptop keys', () => {
  it('never fire while typing, except Escape', () => {
    expect(keyAction({ key: 'n', target: box }, null).action).toBeUndefined();
    expect(keyAction({ key: '/', target: { tagName: 'INPUT' } }, null).action).toBeUndefined();
    expect(keyAction({ key: 'Escape', target: box }, null).action).toBe('close');
  });
  it('single keys and the g-sequences', () => {
    expect(keyAction({ key: '/', target: body }, null).action).toBe('search');
    expect(keyAction({ key: 'N', target: body }, null).action).toBe('write');
    const g = keyAction({ key: 'g', target: body }, null); expect(g).toEqual({ pending: 'g' });
    expect(keyAction({ key: 'c', target: body }, g.pending).action).toBe('calendar'); expect(keyAction({ key: 't', target: body }, 'g').action).toBe('today');
    expect(keyAction({ key: 'c', target: body }, null).action).toBeUndefined();
  });
  it('keys with Ctrl or Cmd are left to the browser', () => expect(keyAction({ key: 'n', target: body, ctrlKey: true }, null).action).toBeUndefined());
});
describe('the reading room', () => {
  it('three columns, with the keys written out', () => {
    const html = renderToStaticMarkup(<DeskView left={<p>L</p>} mid={<p>M</p>} right={<p>R</p>} />);
    expect(html).toMatch(/lp-left[^]*L[^]*lp-mid[^]*M[^]*lp-right[^]*R/); expect(html).toContain('day before, day after');
  });
});
