import { describe, expect, it } from 'vitest';
import catalogue from './fixtures/shelf/media.catalogue-v1.json';
import { catalogueWorks, mentionCards, mentionsIn, workSuggestions } from '../src/shelf/media';
import { parseCard } from '../src/shelf/shelf';

const works = catalogueWorks([catalogue, { nonsense: true }]);
describe('/ links a work from Media’s catalogue', () => {
  it('reads the works from the newest good catalogue card, ignoring anything broken', () => {
    expect(works.map(w => w.title)).toEqual(['Perfect Days', 'Vagabond']);
    expect(catalogueWorks([])).toEqual([]);
  });
  it('suggests works by title, starts first, ignoring case and accents', () => {
    expect(workSuggestions('va', works).map(w => w.title)).toEqual(['Vagabond']);
    expect(workSuggestions('', works)).toHaveLength(2);
  });
  it('finds the works a line mentions with /, only at the start of a word', () => {
    expect(mentionsIn('watched /Perfect Days again, then /vagabond', works).map(w => w.id)).toEqual(['w-perfect-days', 'w-vagabond']);
    expect(mentionsIn('see https://x.org/Perfect Days', works)).toEqual([]);
    expect(mentionsIn('no links here', works)).toEqual([]);
  });
  it('a line with a linked work leaves one logbook.mention card per work, with the line, its day and feelings', () => {
    const cards = mentionCards('thought about /Perfect Days :wistful', works, [{ w: 'wistful', family: 'wistful' }], '2026-10-02', 'e-7', 9);
    expect(cards).toHaveLength(1);
    expect(parseCard(cards[0])).toMatchObject({ id: 'logbook.mention:e-7:w-perfect-days', to: 'media', about: { item: 'w-perfect-days' }, data: { workId: 'w-perfect-days', day: '2026-10-02', feelings: [{ w: 'wistful', family: 'wistful' }] } });
  });
});

it('a private line never leaves Logbook', () => {
  expect(mentionCards('thought about /Perfect Days', works, [], '2026-10-02', 'e-8', 9, true)).toEqual([]);
});
