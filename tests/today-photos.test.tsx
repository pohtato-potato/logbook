import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TodayView } from '../src/screens/Today';

const base = { now: new Date('2026-09-29T15:00:00'), greeting: 'Hi.', entries: [], moments: [], foldedOpen: false, onToggleFold() {}, onConfirmOverall() {}, onChangeOverall() {}, onOpenFeeling() {}, onEntryMenu() {}, writer: <div />, onPickPhotos() {}, onPotd() {}, onPhotoMenu() {} };
const photos = [{ id: 1, thumb: new Blob() }, { id: 2, thumb: new Blob() }];
describe('Today’s photos', () => {
  it('by day: photos with the photo of the day pressed, and a way to add more', () => {
    const html = renderToStaticMarkup(<TodayView {...base} night={false} photos={photos} potd={2} />);
    expect(html).toContain('Today’s photos'); expect(html).toContain('Add from your phone');
    expect(html).toMatch(/aria-pressed="true"[^>]*aria-label="Photo 2, the photo of the day/);
  });
  it('with none, says photos stay on the phone', () => expect(renderToStaticMarkup(<TodayView {...base} night={false} photos={[]} />)).toContain('None yet. Photos stay on your phone.'));
  it('at night the photos fold into Today so far, and the row counts them', () => {
    const html = renderToStaticMarkup(<TodayView {...base} night={true} photos={photos} potd={1} />);
    expect(html).not.toContain('Today’s photos'); expect(html).toContain('2 photos · grateful for');
  });
});
