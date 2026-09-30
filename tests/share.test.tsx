import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readShare, safeUrl } from '../src/share';
import { entryLine } from '../src/domain/entryText';
import { ShareSheetView } from '../src/screens/ShareSheet';

const lk = { places: new Map(), spans: new Map(), people: new Map() };
describe('sharing in', () => {
  it('finds the link in the text when an app puts it there', () => expect(readShare('?title=How%20rivers&text=Look%20https%3A%2F%2Fexample.com%2Fv%3F1')).toEqual({ title: 'How rivers', text: 'Look', url: 'https://example.com/v?1' }));
  it('nothing shared is nothing', () => expect(readShare('?title=&text=&url=')).toBeNull());
  it('very long text is trimmed', () => expect(readShare('?text=' + 'a'.repeat(5000))!.text.length).toBe(2000));
  it('only web addresses can be links', () => { expect(safeUrl('javascript:alert(1)')).toBeNull(); expect(safeUrl('data:text/html,x')).toBeNull(); expect(safeUrl('https://example.com')).toBe('https://example.com/'); });
  it('a kept link reads in words', () => expect(entryLine({ id: 1, day: 'd', at: 0, tz: 'UTC', kind: 'link', text: 'Made me want to walk.', marks: {}, tags: [], people: [], writtenAt: 0, data: { kind: 'link', url: 'https://example.com/v', title: 'How rivers find their way' } }, lk)).toBe('Link: How rivers find their way. Made me want to walk.'));
  it('the sheet offers the three ways, and a quote only with text', () => {
    const html = renderToStaticMarkup(<ShareSheetView shared={{ title: 'How rivers', text: '', url: 'https://example.com/v' }} as="link" line="" onAs={() => {}} onLine={() => {}} onKeep={() => {}} onCancel={() => {}} />);
    expect(html).toContain('Keep in Logbook'); expect(html).toContain('example.com'); expect(html).toContain('Watched'); expect(html).not.toContain('A quote');
  });
  it('an unsafe address is shown as text, never a link', () => {
    const html = renderToStaticMarkup(<ShareSheetView shared={{ title: 'x', text: '', url: 'javascript:alert(1)' }} as="link" line="" onAs={() => {}} onLine={() => {}} onKeep={() => {}} onCancel={() => {}} />);
    expect(html).not.toContain('href="javascript');
  });
});
