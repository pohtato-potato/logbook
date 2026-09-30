import { useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { loadLookup } from '../db/lookup';
import { PERSON_THREADS, tagFamily } from '../domain/colour';
import { parseDay } from '../domain/day';
import { searchAll, type SearchResults } from '../domain/search';
import type { Lookup } from '../domain/entryText';
import type { Family } from '../vocab/vocab';
import { TagChip } from '../ui/Chips';
import { Icon } from '../ui/Icons';
import { Tabs } from '../ui/Tabs';
import { useLook } from '../ui/Look';
import { go } from '../router';
import { RichText } from './KeptCard';
import { FeelingCard } from './FeelingCard';
import { usePrivacy } from '../ui/Privacy';
import { visibleTags } from '../domain/looking';

const long = (d: string) => parseDay(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
/* Lines, #tags, @people and feelings, as you type. Results are announced; each opens its day, page or card. */
export function SearchView({ q, results, lookup, tagFamilies = {}, onQ, onFeeling, locked = false }: { locked?: boolean; q: string; results: SearchResults; lookup: Lookup; tagFamilies?: Record<string, Family>; onQ(q: string): void; onFeeling?(w: string): void }) {
  const { pal } = useLook(), r = results, any = r.lines.length || r.tags.length || r.people.length || r.feelings.length;
  const group = (title: string, body: ReactNode) => <div className="sgroup"><h2 className="lbl">{title}</h2>{body}</div>;
  return <div className="scr"><div className="content scroll">
    <header className="thead row2"><button type="button" className="back" aria-label="Back" onClick={() => history.back()}><Icon name="back" /></button><h1 className="tdate sm">Search</h1></header>
    <input className="sinput" type="search" placeholder="Lines, #tags, @people, feelings" value={q} aria-label="Search" autoFocus onChange={e => onQ(e.target.value)} />
    <div className="sres" aria-live="polite">
      {!q.trim() ? <p className="hint">Search everything you’ve kept: a word, #a tag, @someone, or a feeling.</p> : !any ? <p className="hint">Nothing matches “{q.trim()}” yet.</p> : <>
        {r.lines.length > 0 && group('Kept', r.lines.map(l => <div key={l.id} className="sitem"><button type="button" className="linkish" onClick={() => go({ name: 'day', day: l.day })}><b>{long(l.day)}</b></button>
          <RichText text={l.text} own={{}} lookup={lookup} tagHistory={{}} onOpenFeeling={w => onFeeling?.(w)} onOpenTag={t => go({ name: 'tag', tag: t })} onOpenPerson={i => go({ name: 'person', id: lookup.people.get(i)?.id ?? i.toLowerCase() })} /></div>))}
        {r.tags.length > 0 && group('Tags', <div className="tagcloud">{r.tags.map(t => <TagChip key={t} tag={t} family={tagFamilies[t] ?? 'calm'} onOpen={() => go({ name: 'tag', tag: t })} />)}</div>)}
        {r.people.length > 0 && group('People', <div className="faces">{r.people.map(p => <button key={p.id} type="button" className="face" style={{ ['--pc' as string]: PERSON_THREADS[p.thread % PERSON_THREADS.length] }} aria-label={`${p.name}. Open their page`} onClick={() => go({ name: 'person', id: p.id })}>{p.initial}</button>)}</div>)}
        {r.feelings.length > 0 && group('Feelings', <div className="chips">{r.feelings.map(h => <button key={h.w} type="button" className="feelchip" style={{ ['--fc' as string]: pal[h.family] }} aria-label={`${h.w}, a feeling. Open its card`} onClick={() => onFeeling?.(h.w)}>{h.w}</button>)}</div>)}
      </>}
      {locked && q.trim() && <p className="hint">Some private entries aren’t searched while locked.</p>}
    </div>
  </div><Tabs current="" /></div>;
}
export function Search() {
  const [q, setQ] = useState(''), [card, setCard] = useState<string | null>(null), { locked } = usePrivacy();
  const d = useLiveQuery(async () => {
    const [entries, moments, tags] = await Promise.all([db.entries.toArray(), db.moments.toArray(), db.tags.toArray()]);
    const byDay: Record<string, Family[]> = {}; moments.forEach(m => (byDay[m.day] ??= []).push(m.family));
    const hist: Record<string, Family[]> = {}; entries.forEach(e => e.tags.forEach(t => (hist[t] ??= []).push(...(byDay[e.day] ?? []))));
    return { entries, tags: tags.map(t => t.name), tagFamilies: Object.fromEntries(tags.map(t => [t.name, tagFamily(t.name, hist, 'calm')])) as Record<string, Family>, people: await db.people.toArray(), lookup: await loadLookup(db),
      own: Object.fromEntries((await db.words.toArray()).map(w => [w.word, w.family])) as Record<string, Family> };
  }, []);
  if (!d) return <div className="scr" />;
  return <><SearchView q={q} results={searchAll(q, { ...d, tags: visibleTags(d.tags, d.entries, locked), locked })} locked={locked} lookup={d.lookup} tagFamilies={d.tagFamilies} onQ={setQ} onFeeling={setCard} />
    {card && <FeelingCard word={card} src={{ kind: 'none' }} own={d.own} onClose={() => setCard(null)} />}</>;
}
