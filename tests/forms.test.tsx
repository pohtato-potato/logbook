import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MediaFormView, QuoteFormView, PlaceFormView, PersonFormView, SpanFormView, PastFormView, KeepFormView, validPastDate } from '../src/screens/forms';

const noop = () => {};
const A = { id: 'a', initial: 'A', name: 'Friend A', thread: 2 };
describe('forms', () => {
  it('film: the 1-7 buttons are neutral with their words, and Keep names the kind', () => {
    const html = renderToStaticMarkup(<MediaFormView media="Film" title="Past Lives" rating={6} current={false} note="" onChange={noop} onKeep={noop} />);
    expect(html).toContain('6 of 7 · Exceptional'); expect(html).toContain('Keep this film'); expect(html).not.toMatch(/--fc/);
    expect(html).toContain('aria-label="6, Exceptional"');
  });
  it('film: Keep waits for a title', () => expect(renderToStaticMarkup(<MediaFormView media="Book" title=" " rating={4} current={false} note="" onChange={noop} onKeep={noop} />)).toMatch(/disabled=""[^>]*>[^]*Keep this book/));
  it('quote: who said it, including Overheard', () => {
    const html = renderToStaticMarkup(<QuoteFormView text="x" who="Overheard" where="" people={[A]} onChange={noop} onKeep={noop} />);
    expect(html).toContain('Friend A'); expect(html).toContain('A book or film');
  });
  it('place: works without a position, and says the map needs one', () => {
    const html = renderToStaticMarkup(<PlaceFormView name="A new café" first={true} pos={null} canLocate={true} error="" places={[]} homes={[]} onChange={noop} onLocate={noop} onKeep={noop} />);
    expect(html).toContain('Use where I am'); expect(html).toContain('It shows on your map once it has a position');
    expect(html).not.toMatch(/disabled=""[^>]*>[^]*Keep this place/);
  });
  it('place: with no location on this phone, the button is not offered', () => expect(renderToStaticMarkup(<PlaceFormView name="" first={false} pos={null} canLocate={false} error="" places={[]} homes={[]} onChange={noop} onLocate={noop} onKeep={noop} />)).not.toContain('Use where I am'));
  it('person: faces carry their thread colour, and How is a real choice', () => {
    const html = renderToStaticMarkup(<PersonFormView who={['A']} how="Call" people={[A]} onChange={noop} onKeep={noop} />);
    expect(html).toMatch(/aria-pressed="true"[^>]*>A</); expect(html).toMatch(/aria-pressed="true"[^>]*>Call/);
  });
  it('person: with nobody chosen, Keep waits', () => expect(renderToStaticMarkup(<PersonFormView who={[]} how="Call" people={[A]} onChange={noop} onKeep={noop} />)).toMatch(/disabled=""[^>]*>[^]*Keep this/));
  it('keepsake: needs its name', () => expect(renderToStaticMarkup(<KeepFormView name="" onPick={noop} onChange={noop} onKeep={noop} />)).toMatch(/disabled=""[^>]*>[^]*Keep this keepsake/));
  it('span: colour swatches are labelled with their family, and an error is announced', () => {
    const html = renderToStaticMarkup(<SpanFormView name="Diwali" from="2026-11-10" to="2026-11-06" family="warm" error="The span ends before it starts." onChange={noop} onKeep={noop} />);
    expect(html).toContain('Warm'); expect(html).toMatch(/role="alert"[^>]*>The span ends before it starts/);
  });
  it('something from before: refuses the future, allows the old', () => {
    expect(validPastDate('2027-01-01', '2026-09-29')).toMatch(/future/);
    expect(validPastDate('', '2026-09-29')).toBe('Choose a date.');
    expect(validPastDate('1935-05-01', '2026-09-29')).toBeNull();
    const html = renderToStaticMarkup(<PastFormView date="2022-06-14" text="Graduation" today="2026-09-29" onChange={noop} onKeep={noop} />);
    expect(html).toContain('written later'); expect(html).toContain('max="2026-09-29"');
    expect(renderToStaticMarkup(<PastFormView date="2027-06-14" text="x" today="2026-09-29" onChange={noop} onKeep={noop} />)).toMatch(/disabled=""[^>]*>[^]*Keep this moment/);
  });
  it('place: suggestions only after a position, as chips with distance', () => {
    const base = { name: '', first: false, canLocate: true, error: '', places: [], homes: [], onChange: noop, onLocate: noop, onKeep: noop, onSuggest: noop };
    expect(renderToStaticMarkup(<PlaceFormView {...base} pos={null} suggestions={[]} suggestState="idle" />)).not.toContain('Suggest names nearby');
    const html = renderToStaticMarkup(<PlaceFormView {...base} pos={{ lat: 10, lon: 20 }} suggestions={[{ name: 'Chai Point', km: 0.2 }]} suggestState="idle" />);
    expect(html).toContain('Suggest names nearby'); expect(html).toContain('Chai Point, 0.2 km'); expect(html).toContain('Names from OpenStreetMap');
    expect(renderToStaticMarkup(<PlaceFormView {...base} pos={{ lat: 10, lon: 20 }} suggestions={[]} suggestState="offline" />)).toContain('Couldn’t reach OpenStreetMap');
    expect(renderToStaticMarkup(<PlaceFormView {...base} pos={{ lat: 10, lon: 20 }} suggestions={[]} suggestState="none" />)).toContain('No named places close by');
    expect(renderToStaticMarkup(<PlaceFormView {...base} pos={{ lat: 10, lon: 20 }} suggestions={[]} suggestState="off" />)).toContain('Place names are switched off in Settings');
  });
});
