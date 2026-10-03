import { describe, expect, it } from 'vitest';
import { handToMedia } from '../src/share';
import { cardsFor, parseCard } from '../src/shelf/shelf';

describe('"watched" hands the share to Media (spec §12, owner’s choice B)', () => {
  it('leaves a logbook.share card for Media and says where Media is', async () => {
    const idb = new IDBFactory();
    const where = await handToMedia({ title: 'How a film is edited', text: '', url: 'https://youtu.be/x' }, 'for Sundays', idb, 5);
    expect(where).toBe('../media/');
    const [card] = await cardsFor('media', 'logbook.share', idb);
    expect(parseCard(card)).toMatchObject({ id: 'logbook.share:5', from: 'logbook', to: 'media', data: { title: 'How a film is edited', text: 'for Sundays', url: 'https://youtu.be/x' } });
  });
});
