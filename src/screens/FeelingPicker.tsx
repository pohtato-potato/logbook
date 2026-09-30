import { useState, type CSSProperties } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { addOwnWord, keepMoment, setOverall } from '../db/actions';
import { dayKey } from '../domain/day';
import { onColor, solid } from '../domain/colour';
import { BLENDS, FAMILIES, FAMILY_INFO, FAMILY_NAME, RARE_WORDS, findWord, groupsOf, ladderName, searchFeelings, slangTargets, type Family } from '../vocab/vocab';
import { Icon } from '../ui/Icons';
import { useUndo } from '../ui/Undo';
import { useLook } from '../ui/Look';
import { go } from '../router';
import { Form } from '../ui/Form';

type When = 'now' | 'day';
export type PickerProps = { when: When; fam: Family; word: string; strength: number; about: string; second?: Family; query: string; own: Record<string, Family>;
  onWhen(w: When): void; onFam(f: Family): void; onWord(w: string): void; onStrength(s: number): void; onAbout(a: string): void; onBlend(f?: Family): void; onQuery(q: string): void; onOwnWord(word: string, f: Family): void; onKeep(another: boolean): void };
/* The save bar always says what it will keep, and waits while a search is open, so it can never keep a word you can't see. */
export function pinLabel(p: { word: string; fam: Family; strength: number; query: string; when: When; own: Record<string, Family>; second?: Family }) {
  const sel = findWord(p.word, p.own), ok = !!sel && !p.query.trim();
  return ok ? { disabled: false, label: `Keep “${sel!.w}”${p.second ? ` with ${FAMILY_NAME[p.second].toLowerCase()}` : ''}`, sub: `${ladderName(p.fam, p.strength)} · ${p.when === 'now' ? 'right now' : 'as the day overall'}` }
    : { disabled: true, label: 'Pick a word first', sub: p.query.trim() ? 'Choose one from the list above' : 'Tap a word below' };
}
const v = (o: Record<string, string>) => o as CSSProperties;
export function FeelingPickerView(p: PickerProps) {
  const { pal } = useLook(), fill = (f: Family) => v({ '--fc': pal[f], '--ff': solid(pal[f]), '--fo': onColor(solid(pal[f])) });
  const sel = findWord(p.word, p.own), q = p.query.trim().toLowerCase(), pin = pinLabel(p);
  const chip = (w: string) => { const on = sel?.w === w; return <button key={w} type="button" className={'chip' + (on ? ' on' : '')} aria-pressed={on} style={fill(p.fam)} onClick={() => p.onWord(w)}>{w}</button>; };
  const hits = q ? searchFeelings(q, p.own, 9) : [];
  const results = q ? <div className="fres">
    {hits.map(h => h.kind === 'slang'
      ? <div className="sitem" key={'s' + h.w}><p className="hint">“{h.w}” usually means</p><div className="chips">{slangTargets(h.w).map(w => <button key={w} type="button" className="chip" style={fill(findWord(w, p.own)!.family)} onClick={() => p.onWord(w)}>{w}</button>)}
        <button type="button" className="chip dashed" onClick={() => p.onOwnWord(h.w, h.family)}>Keep “{h.w}” itself</button></div></div>
      : <button key={h.kind + h.w} type="button" className="fres-item" onClick={() => p.onWord(h.w)}><Form family={h.family} label={FAMILY_NAME[h.family]} /><span><b>{h.w}</b> · {FAMILY_NAME[h.family]}<small>{h.note}</small></span></button>)}
    {!hits.length && <p className="hint">Nothing in the dictionary yet.</p>}
    {!hits.some(h => h.w === q) && <div className="sitem"><p className="hint">Keep “{q}” as your own word. Which family is it closest to?</p><div className="chips">{FAMILIES.map(f => <button key={f} type="button" className="chip" style={v({ '--fc': pal[f] })} onClick={() => p.onOwnWord(q, f)}>{FAMILY_NAME[f]}</button>)}</div></div>}
  </div> : null;
  const rare = RARE_WORDS.filter(r => r.family === p.fam), blends = BLENDS.filter(b => b.a === p.fam || b.b === p.fam), own = Object.entries(p.own).filter(([, f]) => f === p.fam);
  const body = <div className="fbody">
    <p className="hint">242 feelings in nine families, 51 words from other languages, everyday slang and your own words.</p>
    <div className="fgrid" role="group" aria-label="Feeling families">{FAMILIES.map(f => <button key={f} type="button" className={'ftile' + (f === p.fam ? ' on' : '')} aria-pressed={f === p.fam} style={v({ '--fc': pal[f] })} onClick={() => p.onFam(f)}><Form family={f} label="" /><b>{FAMILY_NAME[f]}</b></button>)}</div>
    {sel && sel.family === p.fam ? <section className="wordcard" style={v({ '--fc': pal[p.fam] })}>
      <p className="wbig">{sel.w}{p.second && <span className="wlang"> with {FAMILY_NAME[p.second].toLowerCase()}</span>}</p>{sel.lang && <p className="wlang">From {sel.lang}</p>}<p className="entry">{sel.meaning}</p>
      {sel.about.length > 0 && <><h3 className="subl">What it was about</h3><div className="chips">{sel.about.map(n => <button key={n} type="button" className={'chip' + (n === p.about ? ' on' : '')} aria-pressed={n === p.about} style={fill(p.fam)} onClick={() => p.onAbout(n === p.about ? '' : n)}>{n}</button>)}</div></>}
      <h3 className="subl">How strong</h3><div className="rungs">{[1, 2, 3, 4, 5].map(k => <button key={k} type="button" className={'rung' + (k <= p.strength ? ' on' : '')} aria-pressed={k === p.strength} aria-label={`Strength ${k} of 5: ${ladderName(p.fam, k)}`} style={v({ '--fc': pal[p.fam] })} onClick={() => p.onStrength(k)}><i /></button>)}</div>
      <p className="entry"><b>{ladderName(p.fam, p.strength)}</b>, {p.strength} of 5</p></section> : <p className="hint">Pick a word below.</p>}
    <section className="panel"><h2 className="lbl">{FAMILY_NAME[p.fam]}: {FAMILY_INFO[p.fam].holds}</h2>
      {groupsOf(p.fam).map(g => <div className="fgroup" key={g.group}><h3 className="subl">{g.group}</h3><div className="chips">{g.words.map(w => chip(w.w))}</div></div>)}
      {rare.length > 0 && <div className="fgroup"><h3 className="subl">From other languages</h3><div className="chips">{rare.map(r => chip(r.w))}</div></div>}
      {own.length > 0 && <div className="fgroup"><h3 className="subl">Your words</h3><div className="chips">{own.map(([w]) => chip(w))}</div></div>}
      {blends.length > 0 && <div className="fgroup"><h3 className="subl">Mixed feelings</h3><div className="chips">{blends.map(b => { const other = b.a === p.fam ? b.b : b.a, on = p.second === other; return <button key={b.name} type="button" className={'chip' + (on ? ' on' : '')} aria-pressed={on} style={fill(other)} onClick={() => p.onBlend(on ? undefined : other)}>{b.name}, with {FAMILY_NAME[other].toLowerCase()}</button>; })}</div></div>}
    </section></div>;
  return <div className="scr"><div className="content scroll picker">
    <header className="thead row2"><button type="button" className="back" aria-label="Back" onClick={() => go({ name: 'today' })}><Icon name="back" /></button><h1 className="tdate sm">How do you feel?</h1></header>
    <div className="switch" role="group" aria-label="When"><button type="button" aria-pressed={p.when === 'now'} onClick={() => p.onWhen('now')}>Right now</button><button type="button" aria-pressed={p.when === 'day'} onClick={() => p.onWhen('day')}>The whole day</button></div>
    <input className="sinput" type="search" placeholder="Type any feeling, even “meh”" value={p.query} aria-label="Search all feelings" onChange={e => p.onQuery(e.target.value)} />
    {results}{!q && body}
  </div>
  <div className="pinbar"><button type="button" className="btn primary big" disabled={pin.disabled} onClick={() => p.onKeep(false)}><span>{pin.label}</span><small>{pin.sub}</small></button>
    {p.when === 'now' && <button type="button" className="btn ghost" disabled={pin.disabled} onClick={() => p.onKeep(true)}>Keep it, then add another</button>}</div></div>;
}
export function FeelingPicker({ when: startWhen, word: startWord }: { when: When; word?: string }) {
  const undo = useUndo();
  const own = useLiveQuery(async () => Object.fromEntries((await db.words.toArray()).map(w => [w.word, w.family])) as Record<string, Family>, []) ?? {};
  const first = startWord ? findWord(startWord, own) : null;
  const [s, set] = useState<{ when: When; fam: Family; word: string; strength: number; about: string; second?: Family; query: string }>(
    { when: startWhen, fam: first?.family ?? 'wistful', word: first?.w ?? '', strength: 3, about: '', query: '' });
  const patch = (x: Partial<typeof s>) => set(prev => ({ ...prev, ...x }));
  const keep = async (another: boolean) => {
    const sel = findWord(s.word, own); if (!sel || s.query.trim()) return;
    if (s.when === 'day') { undo.show(await setOverall(db, dayKey(new Date()), { word: sel.w, family: s.fam, strength: s.strength }), `The day overall is now ${sel.w}.`, { carry: true }); go({ name: 'today' }); return; }
    const r = await keepMoment(db, { word: sel.w, family: s.fam, second: s.second, about: s.about || undefined, strength: s.strength, at: new Date() });
    undo.show(r.undo, another ? `Kept ${sel.w}. Pick another.` : `Kept ${sel.w} in your inner weather.`, { carry: !another });
    if (another) patch({ about: '', second: undefined, query: '', word: '' }); else go({ name: 'today' });
  };
  return <FeelingPickerView {...s} own={own}
    onWhen={when => patch({ when })} onFam={fam => patch({ fam, word: groupsOf(fam)[0].words[0].w, about: '', second: undefined })}
    onWord={w => { const x = findWord(w, own); if (x) patch({ fam: x.family, word: x.w, about: '', query: '', ...(x.family !== s.fam ? { second: undefined } : {}) }); }}
    onStrength={strength => patch({ strength })} onAbout={about => patch({ about })} onBlend={second => patch({ second })} onQuery={query => patch({ query })}
    onOwnWord={async (w, f) => { await addOwnWord(db, w, f); patch({ fam: f, word: w.trim().toLowerCase(), query: '' }); }} onKeep={keep} />;
}
