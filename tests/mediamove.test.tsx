import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MediaMoveView } from '../src/screens/MediaMove';

const noop = () => {};
describe('the move to Media, on Today', () => {
  it('says nothing when there is nothing to move', () => {
    expect(renderToStaticMarkup(<MediaMoveView state={{ total: 0, received: 0, ready: false }} onLetGo={noop} />)).toBe('');
  });
  it('while it is under way, how far it has got and where to finish it', () => {
    const html = renderToStaticMarkup(<MediaMoveView state={{ total: 12, received: 5, ready: false }} onLetGo={noop} />);
    expect(html).toContain('5 of 12'); expect(html).toContain('href="../media/#/handover"'); expect(html).not.toContain('let them go');
  });
  it('once all have arrived, first saves a backup; only after you confirm it saved does it offer to let them go', () => {
    const first = renderToStaticMarkup(<MediaMoveView state={{ total: 12, received: 12, ready: true }} onLetGo={noop} onBackup={noop} />);
    expect(first).toContain('All 12'); expect(first).toContain('Save a backup'); expect(first).not.toContain('Let them go');
    const second = renderToStaticMarkup(<MediaMoveView state={{ total: 12, received: 12, ready: true }} backedUp onLetGo={noop} onBackup={noop} />);
    expect(second).toContain('Is the backup in your downloads?'); expect(second).toContain('Yes, let them go');
  });
  it('after letting go, says so once', () => {
    expect(renderToStaticMarkup(<MediaMoveView state={{ total: 0, received: 0, ready: false }} done={12} onLetGo={noop} />)).toContain('12 films, books and shows now live in Media');
  });
});
