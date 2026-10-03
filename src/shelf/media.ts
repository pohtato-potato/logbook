import { parseCard, type Card, type LogbookMention, type MediaCatalogue } from './shelf';

/* Linking a work with / (spec §11): Media leaves its catalogue on the shelf; a line that names a work with /Title
   sends Media a logbook.mention card, so the line shows on that work's page in Media. */
export type CatalogueWork = MediaCatalogue['works'][number];
const fold = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* The works in the newest good catalogue card; nothing when there is none. */
export function catalogueWorks(raw: unknown[]): CatalogueWork[] {
  const cards = raw.map(parseCard).filter((c): c is Card => !!c && c.format === 'media.catalogue').sort((a, b) => b.writtenAt - a.writtenAt);
  return (cards[0]?.data as MediaCatalogue | undefined)?.works ?? [];
}

/* Works whose title matches what's typed after /, those starting with it first. */
export function workSuggestions(q: string, works: CatalogueWork[], max = 6): CatalogueWork[] {
  const f = fold(q.trim());
  return works.filter(w => fold(w.title).includes(f)).sort((a, b) => Number(fold(b.title).startsWith(f)) - Number(fold(a.title).startsWith(f))).slice(0, max);
}

/* The works a line names with /Title: the / must start a word, so web addresses and "and/or" never count. Longest titles win a tie. */
export function mentionsIn(text: string, works: CatalogueWork[]): CatalogueWork[] {
  const t = fold(text), found: CatalogueWork[] = [];
  for (const w of [...works].sort((a, b) => b.title.length - a.title.length)) {
    const needle = '/' + fold(w.title);
    for (let i = t.indexOf(needle); i >= 0; i = t.indexOf(needle, i + 1)) {
      if ((i === 0 || /\s/.test(t[i - 1])) && !found.includes(w)) { found.push(w); break; }
    }
  }
  return works.filter(w => found.includes(w));
}

/* One card per linked work. `ref` is the entry's stable id. */
export function mentionCards(text: string, works: CatalogueWork[], feelings: { w: string; family: string }[], day: string, ref: string, now = Date.now()): Card<'logbook.mention', LogbookMention>[] {
  return mentionsIn(text, works).map(w => ({ id: `logbook.mention:${ref}:${w.id}`, format: 'logbook.mention', version: 1, from: 'logbook', to: 'media', about: { item: w.id }, writtenAt: now,
    data: { workId: w.id, day, line: text.slice(0, 2000), feelings } }));
}
