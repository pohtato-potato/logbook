import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ADD_KINDS, AddSheetView } from '../src/screens/AddSheet';
import { FORM_KINDS, SHELF_IDS, parseRoute } from '../src/router';

/* Films, books and shows moved to Media (spec §12): Logbook no longer captures them. */
describe('films, books and shows live in Media now', () => {
  it('the + sheet has no film, book or show', () => {
    expect(ADD_KINDS.map(k => k[0])).not.toContain('media');
    const html = renderToStaticMarkup(<AddSheetView />);
    expect(html).not.toContain('Film, book or show'); expect(html).not.toContain('1–7');
  });
  it('there is no film form, no 1–7 rating and no Currently pin to reach', () => {
    expect(FORM_KINDS as readonly string[]).not.toContain('media');
    expect(parseRoute('#/form/media')).not.toMatchObject({ name: 'form', kind: 'media' });
  });
  it('the films, books and shows shelf is gone', () => {
    expect(SHELF_IDS as readonly string[]).not.toContain('media');
  });
});
