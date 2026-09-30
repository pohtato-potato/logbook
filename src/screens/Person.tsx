import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { setPersonThread } from '../db/actions';
import { loadLookup } from '../db/lookup';
import type { Entry, Person as P } from '../db/types';
import { PERSON_THREADS } from '../domain/colour';
import { parseDay } from '../domain/day';
import { feelingsOf } from '../domain/line';
import { togetherStats } from '../domain/people';
import type { Lookup } from '../domain/entryText';
import { nextBirthday } from './Shelves';
import { Icon } from '../ui/Icons';
import { Tabs } from '../ui/Tabs';
import { useUndo } from '../ui/Undo';
import { go } from '../router';
import { KeptCard } from './KeptCard';
import { usePrivacy } from '../ui/Privacy';

export type PersonFilter = 'all' | 'events' | 'feelings';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dm = (d: string) => parseDay(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
const Back = () => <button type="button" className="back" aria-label="Back" onClick={() => history.back()}><Icon name="back" /></button>;
/* A person page describes time together, in plain facts. Never "last seen N days ago", never "usually low". */
export function PersonView({ person, stats, year, entries, lookup, filter, onFilter, onThread, locked = false }: { locked?: boolean; person: P; stats: ReturnType<typeof togetherStats>; year: number; entries: Entry[]; lookup: Lookup; filter: PersonFilter; onFilter(f: PersonFilter): void; onThread(): void }) {
  const bday = person.birthday ? nextBirthday(person.birthday, `${year}-01-01`) : null, max = Math.max(1, ...stats.byMonth), thread = { ['--pc' as string]: PERSON_THREADS[person.thread % PERSON_THREADS.length] };
  const shown = [...entries].sort((a, b) => b.day.localeCompare(a.day) || b.at - a.at).filter(e => filter === 'all' || (filter === 'events' ? e.kind !== 'line' : !(locked && e.marks.priv) && feelingsOf(e.text, {}).length > 0));
  let lastMonth = '';
  return <div className="scr"><div className="content scroll">
    <header className="thead row2"><Back /><h1 className="tdate sm">{person.name}</h1></header>
    <section className="panel"><div className="phead"><span className="face" style={thread} aria-hidden="true">{person.initial}</span><div>
      <p className="entry"><b>{stats.days ? `Together ${stats.days} ${stats.days === 1 ? 'day' : 'days'} this year` : 'No days together kept yet this year'}</b></p>
      <p className="entry">{stats.last ? `Last together on ${dm(stats.last)}. ` : ''}{bday ? `Birthday on ${dm(bday.day)}.` : ''}</p></div></div>
      <div className="setrow"><div><b>Their colour</b><span>A thread you pick. It never means a feeling.</span></div><button type="button" className="btn sm" style={thread} onClick={onThread}><i className="dotc" aria-hidden="true" />Change</button></div></section>
    <section className="panel"><h2 className="lbl">Days together, {year}</h2>
      <div className="tbars" role="img" aria-label={`Days together each month in ${year}: ${MONTHS.map((m, k) => `${m} ${stats.byMonth[k]}`).join(', ')}`}>{stats.byMonth.map((v, k) => <span key={k} className="tbar"><i style={{ height: v ? 8 + (v / max) * 56 : 2 }} /><b>{MONTHS[k][0]}</b></span>)}</div></section>
    <div className="pfilter" role="group" aria-label="Show">{(['all', 'events', 'feelings'] as const).map(k => <button key={k} type="button" className={'chip' + (filter === k ? ' on ink' : '')} aria-pressed={filter === k} onClick={() => onFilter(k)}>{k === 'all' ? 'All' : k === 'events' ? 'Events' : 'Feelings'}</button>)}</div>
    <section className="panel">{shown.length ? shown.map(e => { const m = parseDay(e.day).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), head = m !== lastMonth; lastMonth = m;
      return <div key={e.id}>{head && <h3 className="subl">{m}</h3>}<KeptCard entry={e} lookup={lookup} own={{}} onOpenFeeling={() => go({ name: 'day', day: e.day })} onOpenTag={tag => go({ name: 'tag', tag })} /></div>; })
      : <p className="entry">Nothing of this kind yet.</p>}</section>
  </div><Tabs current="shelves" /></div>;
}
export function Person({ id }: { id: string }) {
  const undo = useUndo(), { locked } = usePrivacy(), [filter, setFilter] = useState<PersonFilter>('all'), year = new Date().getFullYear();
  const d = useLiveQuery(async () => {
    const person = (await db.people.get(id)) ?? (await db.people.toArray()).find(p => p.initial.toLowerCase() === id.toLowerCase());
    if (!person) return { person: null, entries: [] as Entry[], lookup: null };
    return { person, entries: await db.entries.where('people').equals(person.initial).toArray(), lookup: await loadLookup(db) };
  }, [id]);
  if (!d) return <div className="scr" />;
  if (!d.person || !d.lookup) return <div className="scr"><div className="content scroll"><header className="thead row2"><Back /><h1 className="tdate sm">Person</h1></header>
    <p className="entry">This person isn’t in Logbook. People come from your private starter file, in Settings.</p></div><Tabs current="shelves" /></div>;
  const person = d.person;
  return <PersonView person={person} stats={togetherStats(person.initial, d.entries, year)} year={year} entries={d.entries} lookup={d.lookup} filter={filter} onFilter={setFilter} locked={locked}
    onThread={() => { setPersonThread(db, person.id, (person.thread + 1) % PERSON_THREADS.length).catch(undo.fail); }} />;
}
