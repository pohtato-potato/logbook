import type { ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { getSettings } from '../db/actions';
import { loadLookup } from '../db/lookup';
import type { Entry, Person, Place, Span } from '../db/types';
import { dayKey, parseDay } from '../domain/day';
import { PERSON_THREADS, tagFamily } from '../domain/colour';
import { ratingText } from '../domain/rating';
import { DOING, dateRange, entryLine, type Lookup } from '../domain/entryText';
import { drawPlaceMap } from '../draw/placeMap';
import { Scene } from '../draw/Canvas';
import { FAMILY_NAME, type Family } from '../vocab/vocab';
import { TagChip } from '../ui/Chips';
import { Icon } from '../ui/Icons';
import { Tabs } from '../ui/Tabs';
import { useLook } from '../ui/Look';
import { BlobImg } from '../ui/Blob';
import { useNow } from '../ui/useNow';
import { go, SHELF_IDS, type ShelfId } from '../router';
import { nextBirthday } from '../domain/birthday';
import { maskPrivate } from '../domain/looking';
import { usePrivacy } from '../ui/Privacy';

export const SHELF_NAME: Record<ShelfId, string> = { firsts: 'Firsts', media: 'Films, books and shows', quotes: 'Quotes', places: 'Places', keeps: 'Keepsakes', bdays: 'Birthdays and gifts', spans: 'Spans' };
const EMPTY: Record<ShelfId, string> = { firsts: 'Firsts appear here when you mark something First.', media: 'Films, books and shows appear here when you keep one from the + button.', quotes: 'Quotes appear here when you keep one from the + button.',
  places: 'Places appear here when you keep one from the + button.', keeps: 'Keepsakes appear here when you keep one from the + button.', bdays: 'Birthdays come from your private starter file, in Settings.', spans: 'Trips and stretches of days appear here when you keep a span.' };
const short = (d: string) => parseDay(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const count = (n: number, one: string) => (n ? plural(n, one) : 'None yet');
export { nextBirthday };
const media = (es: Entry[]) => es.filter(e => e.data?.kind === 'media');
/* The small line under each shelf's name. */
export function shelfCounts(entries: Entry[], places: Place[], people: Person[], spans: Span[], today: string): Record<ShelfId, string> {
  const year = today.slice(0, 4), firsts = entries.filter(e => e.marks.first && e.day.startsWith(year)).length;
  const cur = media(entries).filter(e => e.data?.kind === 'media' && e.data.current).length, m = media(entries).length;
  const bd = people.map(p => ({ p, b: nextBirthday(p.birthday, today) })).filter(x => x.b).sort((a, b) => a.b!.inDays - b.b!.inDays)[0];
  return {
    firsts: firsts ? `${firsts} this year` : 'None yet',
    media: cur ? `${cur} on the go` : m ? plural(m, 'kept', 'kept') : 'None yet',
    quotes: count(entries.filter(e => e.kind === 'quote').length, 'quote'),
    places: places.some(p => p.first) ? `${places.length}, of them ${plural(places.filter(p => p.first).length, 'first')}` : count(places.length, 'place'),
    keeps: count(entries.filter(e => e.kind === 'keep').length, 'keepsake'),
    bdays: bd ? `${bd.p.name}’s ${bd.b!.inDays === 0 ? 'is today' : `in ${plural(bd.b!.inDays, 'day')}`}` : 'None yet',
    spans: count(spans.length, 'span'),
  };
}
const Face = ({ p }: { p: Person }) => <span className="face" style={{ ['--pc' as string]: PERSON_THREADS[p.thread % PERSON_THREADS.length] }} aria-hidden="true">{p.initial}</span>;
export function ShelvesView({ counts, people, tags }: { counts: Record<ShelfId, string>; people: Person[]; tags: { name: string; family: Family }[] }) {
  return <div className="scr"><div className="content scroll">
    <header className="thead"><h1 className="tdate sm">Shelves</h1><p className="tstamp">Everything, sorted by kind</p></header>
    <div className="shelftiles">{SHELF_IDS.map(k => <button key={k} type="button" className="shelftile" onClick={() => go({ name: 'shelf', shelf: k })}><b>{SHELF_NAME[k]}</b><span>{counts[k]}</span></button>)}</div>
    <section className="panel"><h2 className="lbl">People</h2>{people.length ? <div className="shelfgrid">{people.map(p => <button key={p.id} type="button" className="shelfp" onClick={() => go({ name: 'person', id: p.id })}><Face p={p} /><span>{p.name}</span></button>)}</div>
      : <p className="hint">People come from your private starter file, in Settings.</p>}</section>
    <section className="panel"><h2 className="lbl">Tags</h2>{tags.length ? <><div className="tagcloud">{tags.map(t => <TagChip key={t.name} tag={t.name} family={t.family} onOpen={() => go({ name: 'tag', tag: t.name })} />)}</div><p className="hint">A tag’s colour is the feeling it most often comes with.</p></>
      : <p className="hint">Type # in your line to start a tag.</p>}</section>
  </div><Tabs current="shelves" /></div>;
}
const Item = ({ lead, title, sub, right, onOpen }: { lead: ReactNode; title: ReactNode; sub: string; right?: ReactNode; onOpen?(): void }) =>
  <div className="pitem">{lead}<div>{onOpen ? <button type="button" className="linkish" onClick={onOpen}><b>{title}</b></button> : <b>{title}</b>}<span>{sub}</span></div>{right ?? <span />}</div>;
export type ShelfProps = { shelf: ShelfId; entries: Entry[]; lookup: Lookup; thumbs: Map<number, Blob>; places: Place[]; homes: { lat: number; lon: number }[]; people: Person[]; spans: Span[]; today?: string };
/* One shelf. Newest first; each item opens its day. */
export function ShelfView(p: ShelfProps) {
  const look = useLook(), today = p.today ?? dayKey(new Date()), newest = [...p.entries].sort((a, b) => b.day.localeCompare(a.day) || b.at - a.at), open = (d: string) => () => go({ name: 'day', day: d });
  let body: ReactNode[] = [];
  switch (p.shelf) {
    case 'firsts': body = newest.filter(e => e.marks.first).map(e => <Item key={e.id} lead={<span className="addico"><Icon name="first" /></span>} title={entryLine(e, p.lookup).replace(/ \(a first\)/, '')} sub={short(e.day)} onOpen={open(e.day)} />); break;
    case 'media': {
      const ms = newest.filter(e => e.data?.kind === 'media'), cur = ms.filter(e => e.data?.kind === 'media' && e.data.current), rest = ms.filter(e => !cur.includes(e));
      const row = (e: Entry) => { const d = e.data as Extract<Entry['data'], { kind: 'media' }>; return <Item key={e.id} lead={<span className="addico"><Icon name="k-media" /></span>} title={d.title} sub={`${d.media} · ${short(e.day)}${e.text ? ` · ${e.text}` : ''}`} right={<span className="rating">{ratingText(d.rating)}</span>} onOpen={open(e.day)} />; };
      body = [...(cur.length ? [<h3 key="c" className="subl">Currently</h3>, ...cur.map(e => { const d = e.data as Extract<Entry['data'], { kind: 'media' }>; return <div key={'c' + e.id}>{row(e)}<p className="hint">Currently {DOING[d.media]}</p></div>; })] : []),
        ...(cur.length && rest.length ? [<h3 key="r" className="subl">Kept</h3>] : []), ...rest.map(row)];
      break;
    }
    case 'quotes': body = newest.filter(e => e.kind === 'quote').map(e => <blockquote key={e.id} className="qcard">{entryLine(e, p.lookup).replace(/ \(([^)]*)\)$/, '')}<small>{entryLine(e, p.lookup).match(/\(([^)]*)\)$/)?.[1].replace(/^./, c => c.toUpperCase())} · {short(e.day)}</small></blockquote>); break;
    case 'places': body = p.places.length ? [<Scene key="map" className="mapbig" animate label={`A drawn map of your places. ${p.places.filter(x => x.lat != null).length} of ${p.places.length} have a position; firsts glow.`} draw={(ctx, w, h, t) => drawPlaceMap(ctx, look, w, h, t, p.places, p.homes)} />,
      ...[...p.places].sort((a, b) => b.visits - a.visits).map(pl => <Item key={pl.id} lead={<span className="addico"><Icon name={pl.first ? 'first' : 'k-place'} /></span>} title={`${pl.first ? 'A first: ' : ''}${pl.name}`} sub={`${plural(pl.visits, 'visit')}${pl.lat == null ? ' · no position yet' : ''}`} />)] : []; break;
    case 'keeps': body = newest.filter(e => e.kind === 'keep').length ? [<div key="g" className="keepgrid">{newest.filter(e => e.kind === 'keep').map(e => { const id = e.data?.kind === 'keep' ? e.data.photoId : undefined;
      return <button key={e.id} type="button" className="keeptile" onClick={open(e.day)}>{id != null && p.thumbs.get(id) ? <BlobImg blob={p.thumbs.get(id)} alt="" className="photo" /> : <span className="photo" aria-hidden="true" />}<b>{e.text}</b><span>{short(e.day)}</span></button>; })}</div>] : []; break;
    case 'bdays': body = p.people.map(x => ({ x, b: nextBirthday(x.birthday, today) })).filter(y => y.b).sort((a, b) => a.b!.inDays - b.b!.inDays).map(({ x, b }) => {
      const gifts = newest.filter(e => e.marks.gift && e.people.includes(x.initial));
      return <div key={x.id} className="bday"><Face p={x} /><div><b>{x.name}, {parseDay(b!.day).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</b><span>{b!.inDays === 0 ? 'Today!' : `in ${plural(b!.inDays, 'day')}`}</span>
        {gifts.map(g => <p key={g.id} className="gift"><Icon name="gift" />{entryLine(g, p.lookup)}</p>)}</div></div>; }); break;
    case 'spans': body = [...p.spans].sort((a, b) => b.from.localeCompare(a.from)).map(s => <Item key={s.id} lead={<span className="spanbar" style={{ background: look.pal[s.family] }} aria-hidden="true" />} title={s.name} sub={`${dateRange(s.from, s.to)} ${s.to.slice(0, 4)} · ${FAMILY_NAME[s.family]}`} onOpen={open(s.from)} />); break;
  }
  return <div className="scr"><div className="content scroll">
    <header className="thead row2"><button type="button" className="back" aria-label="Back" onClick={() => history.back()}><Icon name="back" /></button><h1 className="tdate sm">{SHELF_NAME[p.shelf]}</h1></header>
    <section className="panel">{body.length ? body : <p className="entry">{EMPTY[p.shelf]}</p>}</section>
  </div><Tabs current="shelves" /></div>;
}
async function tagFamilies() {
  const [entries, moments, tags] = await Promise.all([db.entries.toArray(), db.moments.toArray(), db.tags.toArray()]);
  const byDay: Record<string, Family[]> = {}; moments.forEach(m => (byDay[m.day] ??= []).push(m.family));
  const hist: Record<string, Family[]> = {}; entries.forEach(e => e.tags.forEach(t => (hist[t] ??= []).push(...(byDay[e.day] ?? []))));
  return { hist, tags: tags.map(t => ({ name: t.name, family: tagFamily(t.name, hist, 'calm') })).sort((a, b) => (hist[b.name]?.length ?? 0) - (hist[a.name]?.length ?? 0)) };
}
export function Shelves() {
  const today = dayKey(useNow());
  const d = useLiveQuery(async () => {
    const [entries, places, people, spans] = await Promise.all([db.entries.toArray(), db.places.toArray(), db.people.toArray(), db.spans.toArray()]);
    return { counts: shelfCounts(entries, places, people, spans, today), people, tags: (await tagFamilies()).tags };
  }, [today]);
  return d ? <ShelvesView {...d} /> : <div className="scr" />;
}
export function Shelf({ shelf }: { shelf: ShelfId }) {
  const today = dayKey(useNow()), { locked } = usePrivacy();
  const d = useLiveQuery(async () => {
    const [entries, places, people, spans, settings, photos] = await Promise.all([db.entries.toArray(), db.places.toArray(), db.people.toArray(), db.spans.toArray(), getSettings(db), shelf === 'keeps' ? db.photos.toArray() : Promise.resolve([])]);
    return { entries: maskPrivate(entries, locked), places, people, spans, homes: settings.homes, lookup: await loadLookup(db), thumbs: new Map(photos.map(ph => [ph.id!, ph.thumb])) };
  }, [shelf, locked]);
  return d ? <ShelfView shelf={shelf} today={today} {...d} /> : <div className="scr" />;
}
