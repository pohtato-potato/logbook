import { useState, type CSSProperties } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { removeFeelingFromEntry, removeMoment } from '../db/actions';
import { GROUND, inkOf } from '../domain/colour';
import { FAMILY_INFO, FAMILY_NAME, feelingOf, findWord, ladderName, slangTargets, type Family } from '../vocab/vocab';
import { Sheet } from '../ui/Sheet';
import { useUndo } from '../ui/Undo';
import { useLook } from '../ui/Look';
import { Form } from '../ui/Form';

export type FeelingSource = { kind: 'draft' } | { kind: 'entry'; id: number } | { kind: 'moment'; id: number } | { kind: 'none' };
/* The feeling card: what the word means, its family and strength, close words, and a way to remove it. */
export function FeelingCardView({ word, family, meaning, lang, strength, close, canRemove, where, onRemove, onClose, onOpenWord }:
  { word: string; family: Family; meaning: string; lang?: string; strength: number; close: string[]; canRemove: boolean; where: string; onRemove(): void; onClose(): void; onOpenWord(w: string): void }) {
  const look = useLook(), g = GROUND[look.theme];
  return <Sheet label={word} onClose={onClose}>
    <div className="gl-top"><span className="gl-form"><Form family={family} label={FAMILY_NAME[family]} /></span><div><p className="gl-w">{word}</p><p className="gl-fam" style={{ color: inkOf(look.pal[family], g.solid, look.theme === 'dark') }}>{FAMILY_NAME[family]} · {FAMILY_INFO[family].holds}</p></div></div>
    <p className="entry">{meaning}{lang ? ` From ${lang}.` : ''}</p>
    <div className="gl-str"><span className="rungs sm" aria-hidden="true">{[1, 2, 3, 4, 5].map(k => <i key={k} className={k <= strength ? 'on' : ''} style={{ ['--fc' as string]: look.pal[family] } as CSSProperties} />)}</span><p className="entry"><b>{ladderName(family, strength)}</b>, strength {strength} of 5</p></div>
    {close.length > 0 && <><p className="subl">Close to</p><div className="chips">{close.map(w => { const f = findWord(w, {})?.family ?? family; return <button key={w} type="button" className="chip" style={{ ['--fc' as string]: look.pal[f] } as CSSProperties} onClick={() => onOpenWord(w)}>{w}</button>; })}</div></>}
    <div className="btnrow">{canRemove && <button type="button" className="btn danger" onClick={onRemove}>Remove {where}</button>}<button type="button" className="btn primary" onClick={onClose}>Close</button></div>
  </Sheet>;
}
export function FeelingCard({ word, src, own, onClose, onRemoveFromDraft }: { word: string; src: FeelingSource; own: Record<string, Family>; onClose: () => void; onRemoveFromDraft?: (word: string) => void }) {
  const undo = useUndo(), [shown, setShown] = useState(word), isOrig = shown === word;
  const moment = useLiveQuery(async () => (src.kind === 'moment' ? db.moments.get(src.id) : undefined), [src]);
  const fo = feelingOf(shown, own); if (!fo) return null;
  const x = findWord(fo.w, own), targets = x ? [] : slangTargets(fo.w);
  const meaning = x ? x.meaning : targets.length ? `An everyday word. It usually means ${targets.join(' or ')}.` : 'Your own word.';
  const strength = (isOrig ? moment?.strength : undefined) ?? x?.s ?? 3;
  const close = x ? x.close.filter(w => findWord(w, {})).slice(0, 5) : targets.slice(0, 4);
  const where = src.kind === 'draft' ? 'from this line' : src.kind === 'entry' ? 'from this entry' : src.kind === 'moment' ? 'from today' : '';
  const remove = async () => {
    try {
      if (src.kind === 'draft') onRemoveFromDraft?.(fo.w);
      else if (src.kind === 'entry') undo.show(await removeFeelingFromEntry(db, src.id, fo.w), `Removed ${fo.w} from this entry.`);
      else if (src.kind === 'moment') undo.show(await removeMoment(db, src.id), `Removed ${fo.w} from today.`);
    } catch (e) { undo.fail(e); }
    onClose();
  };
  return <FeelingCardView word={fo.w} family={fo.family} meaning={meaning} lang={x?.lang} strength={strength} close={close} canRemove={isOrig && src.kind !== 'none'} where={where} onRemove={remove} onClose={onClose} onOpenWord={setShown} />;
}
