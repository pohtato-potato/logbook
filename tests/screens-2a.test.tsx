import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AddSheetView } from '../src/screens/AddSheet';
import { MediaFormView, QuoteFormView, PlaceFormView, PersonFormView, KeepFormView, SpanFormView, PastFormView, PhotoFormView } from '../src/screens/forms';
import { VoiceFormView } from '../src/screens/forms/VoiceForm';
import { ShelvesView, ShelfView, shelfCounts } from '../src/screens/Shelves';
import { PersonView } from '../src/screens/Person';
import { TagView } from '../src/screens/TagPage';
import { SearchView } from '../src/screens/Search';
import { searchAll } from '../src/domain/search';
import { DayPageView } from '../src/screens/DayPage';
import { SHELF_IDS } from '../src/router';
import { OutsideLine, StampsPanelView } from '../src/screens/Stamps';
import { stampList } from '../src/domain/stamps';
import { GalleryView } from '../src/screens/calendar/Gallery';
import { YearView } from '../src/screens/calendar/Year';
import { LifeView } from '../src/screens/calendar/Life';
import { FeelingsView } from '../src/screens/calendar/Feelings';
import { CalendarView } from '../src/screens/Calendar';
import { PrivacyContext } from '../src/ui/Privacy';
import { KeptCard } from '../src/screens/KeptCard';
import { dayFamilies, hourMix, lifeItems, monthStats, oftenWith, peopleWith, wordCounts, yearDays } from '../src/domain/looking';
import type { Entry, Person, Place, Span } from '../src/db/types';

const noop = () => {};
const bad = /undefined|NaN|\[object Object\]/;
const A: Person = { id: 'a', initial: 'A', name: 'Friend A', thread: 0, birthday: '10-11' };
const places: Place[] = [{ id: 1, name: 'Café', first: true, visits: 3, lat: 10.001, lon: 20.001 }, { id: 2, name: 'No position', first: false, visits: 1 }];
const spans: Span[] = [{ id: 1, name: 'Trip', from: '2026-09-17', to: '2026-09-21', family: 'curious' }];
const lookup = { places: new Map(places.map(p => [p.id!, p])), spans: new Map(spans.map(s => [s.id!, s])), people: new Map([['A', A]]) };
const e = (id: number, x: Partial<Entry>): Entry => ({ id, day: '2026-09-20', at: Date.UTC(2026, 8, 20, 10), tz: 'Asia/Kolkata', kind: 'line', text: 'with @A #walk :calm', marks: { first: true, gift: true }, tags: ['walk'], people: ['A'], writtenAt: Date.UTC(2026, 8, 29), ...x });
const entries: Entry[] = [e(1, {}), e(2, { kind: 'media', text: 'good', data: { kind: 'media', media: 'Film', title: 'T', rating: 7, current: true } }), e(3, { kind: 'quote', text: 'q', data: { kind: 'quote', who: 'A', where: 'here' } }),
  e(4, { kind: 'place', text: '', data: { kind: 'place', placeId: 1, first: true } }), e(5, { kind: 'person', text: '', data: { kind: 'person', who: ['A'], how: 'Messages' } }), e(6, { kind: 'keep', text: 'Ticket', data: { kind: 'keep' } }),
  e(7, { kind: 'span', text: '', data: { kind: 'span', spanId: 1 } }), e(8, { kind: 'past', day: '2022-06-14', text: 'Graduation', data: { kind: 'past' } })];
describe('every Stage 2a screen renders cleanly, empty and full', () => {
  it('the + sheet and every form', () => {
    const html = [renderToStaticMarkup(<AddSheetView />),
      renderToStaticMarkup(<MediaFormView media="Other" title="" rating={1} current note="" onChange={noop} onKeep={noop} />),
      renderToStaticMarkup(<QuoteFormView text="" who="Overheard" where="" people={[]} onChange={noop} onKeep={noop} />),
      renderToStaticMarkup(<PlaceFormView name="x" first pos={{ lat: 10, lon: 20 }} canLocate error="" places={places} homes={[{ lat: 10.002, lon: 20.002 }]} onChange={noop} onLocate={noop} onKeep={noop} />),
      renderToStaticMarkup(<PersonFormView who={[]} how="In person" people={[]} onChange={noop} onKeep={noop} />),
      renderToStaticMarkup(<KeepFormView name="x" onPick={noop} onChange={noop} onKeep={noop} />),
      renderToStaticMarkup(<SpanFormView name="" from="" to="" family="low" error="" onChange={noop} onKeep={noop} />),
      renderToStaticMarkup(<PastFormView date="" text="" today="2026-09-29" onChange={noop} onKeep={noop} />),
      renderToStaticMarkup(<PhotoFormView onPick={noop} />),
      ...(['idle', 'recording', 'recorded', 'denied', 'unsupported'] as const).map(s => renderToStaticMarkup(<VoiceFormView state={s} seconds={61} onStart={noop} onStop={noop} onDiscard={noop} onKeep={noop} />))];
    html.forEach(h => expect(h).not.toMatch(bad));
  });
  it('shelves, each shelf, person, tag and search pages', () => {
    const html = [renderToStaticMarkup(<ShelvesView counts={shelfCounts(entries, places, [A], spans, '2026-09-29')} people={[A]} tags={[{ name: 'walk', family: 'warm' }]} />),
      renderToStaticMarkup(<ShelvesView counts={shelfCounts([], [], [], [], '2026-09-29')} people={[]} tags={[]} />),
      ...SHELF_IDS.flatMap(s => [renderToStaticMarkup(<ShelfView shelf={s} entries={entries} lookup={lookup} thumbs={new Map()} places={places} homes={[]} people={[A]} spans={spans} today="2026-09-29" />),
        renderToStaticMarkup(<ShelfView shelf={s} entries={[]} lookup={lookup} thumbs={new Map()} places={[]} homes={[]} people={[]} spans={[]} today="2026-09-29" />)]),
      renderToStaticMarkup(<PersonView person={A} stats={{ days: 3, last: '2026-09-20', byMonth: Array(12).fill(0) }} year={2026} entries={entries} lookup={lookup} filter="events" onFilter={noop} onThread={noop} />),
      renderToStaticMarkup(<TagView tag="walk" family="warm" fromHistory entries={entries} dayFamily={{}} lookup={lookup} month="2026-02" />),
      renderToStaticMarkup(<SearchView q="a" results={searchAll('a', { entries, tags: ['walk'], people: [A], own: {}, lookup })} lookup={lookup} onQ={noop} />),
      renderToStaticMarkup(<SearchView q="" results={searchAll('', { entries, tags: [], people: [], own: {}, lookup })} lookup={lookup} onQ={noop} />),
      renderToStaticMarkup(<DayPageView day="2026-09-20" style="bloom" entries={entries} moments={[]} own={{}} lookup={lookup} />)];
    html.forEach(h => expect(h).not.toMatch(bad));
  });
  it('stamps in every state, with and without data, including polar days', () => {
    const lists = [stampList({ day: '2026-06-21', today: '2026-06-21', pos: { lat: 78.22, lon: 15.65, source: 'here' }, homes: [], people: [A], spans }), stampList({ day: '2026-09-29', today: '2026-09-29', pos: null, homes: [], people: [], spans: [] })];
    for (const list of lists) for (const status of ['ok', 'off', 'no-place', 'offline', 'loading'] as const) for (const open of [true, false]) {
      expect(renderToStaticMarkup(<StampsPanelView list={list} status={status} open={open} onToggle={noop} onWhere={noop} canLocate placeSource="home" />)).not.toMatch(bad);
      expect(renderToStaticMarkup(<OutsideLine list={list} />)).not.toMatch(bad);
    }
    expect(Object.fromEntries(lists[0])['Sun']).toBe('The sun doesn’t set today');
  });
  it('the calendar tabs and the lock, empty and full, locked and unlocked', () => {
    const ms = [{ id: 1, day: '2026-09-20', at: new Date('2026-09-20T09:00:00').getTime(), word: 'calm', family: 'calm' as const, strength: 3, about: 'then tired' }];
    const fams = dayFamilies(ms, []);
    for (const [moments, es] of [[ms, entries], [[], []]] as const) {
      const f = dayFamilies([...moments], []);
      const html = [
        renderToStaticMarkup(<GalleryView month="2026-09" today="2026-09-29" cells={moments.length ? { '2026-09-20': { overall: 'calm', moments: [{ h: 9, family: 'calm', strength: 3 }] } } : {}} onOpen={noop} />),
        ...(['ring', 'pixels'] as const).flatMap(style => [null, 0, 262, 364].map(pick => renderToStaticMarkup(<YearView year={2026} today="2026-09-29" days={yearDays(2026, f)} style={style} pick={pick} onStyle={noop} onPick={noop} onYear={noop} onOpen={noop} wordsOf={() => []} />))),
        ...[true, false].map(locked => renderToStaticMarkup(<LifeView items={lifeItems([...es], spans, [], lookup, locked, f)} onAdd={noop} locked={locked} />)),
        renderToStaticMarkup(<FeelingsView month="2026-09" stats={monthStats('2026-09', [...moments])} words={wordCounts([...moments])} mix={hourMix([...moments])} often={oftenWith([...es], f)} withPeople={peopleWith([...es], f, [A])} sel={{ kind: 'fam', key: 'calm' }} onSel={noop} daysWith={[]} />),
        ...(['days', 'gallery', 'year', 'life', 'feelings'] as const).map(tab => renderToStaticMarkup(<CalendarView month="2026-09" today="2026-09-29" tab={tab} days={{}} spans={spans} open={null} onOpen={noop} onMonth={noop}><p /></CalendarView>)),
        ...[true, false].map(locked => renderToStaticMarkup(<PrivacyContext.Provider value={{ enabled: true, locked, unlock: async () => true, lockNow: noop }}>{es.map(e => <KeptCard key={e.id} entry={{ ...e, marks: { ...e.marks, priv: true } }} lookup={lookup} own={{}} onOpenFeeling={noop} />)}</PrivacyContext.Provider>)),
      ];
      html.forEach(h => expect(h).not.toMatch(/undefined|NaN|Infinity|\[object Object\]/));
    }
    expect(fams.size).toBe(1);
  });
});

