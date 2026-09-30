import type { Entry, Moment, Person } from '../db/types';
import { cardColours, cardPng, wrappedCards, type Card } from '../draw/cards';
import { drawForm } from '../draw/forms';
import { Scene } from '../draw/Canvas';
import { useLook } from '../ui/Look';
import { useUndo } from '../ui/Undo';
import { saveFile } from './Settings';

/* The month as cards you can swipe through and save as pictures. Each card's words are real text; the saved picture says the same. */
export function WrappedView({ month, cards, onSave }: { month: string; cards: Card[]; onSave(c: Card): void }) {
  const look = useLook();
  if (!cards.length) return <p className="entry">Wrapped needs a few days kept this month.</p>;
  return <>
    <p className="hint">Swipe through. Each card can be saved as a picture.</p>
    <div className="wrapped" role="list" aria-label={`Your ${month} in cards`}>{cards.map(c => { const col = cardColours(look, c.families);
      return <div key={c.kind} className="wcard" role="listitem" style={{ background: `linear-gradient(160deg, ${col.from}, ${col.to})`, color: col.text }}>
        <p className="wk">{c.title}</p><Scene label="" draw={(ctx, w, h) => drawForm(ctx, look, c.families[0], w / 2, h / 2, Math.min(w, h) * 0.36, 0)} />
        <p className={c.big.length <= 4 ? 'rn huge' : 'wbig2'}>{c.big}</p><p>{c.line}</p>
        <button type="button" className="btn sm" style={{ color: col.text, borderColor: col.text, background: 'transparent' }} onClick={() => onSave(c)}>Save as picture</button></div>; })}</div>
  </>;
}
export function Wrapped({ month, entries, moments, people = [] }: { month: string; entries: Entry[]; moments: Moment[]; people?: Person[] }) {
  const look = useLook(), undo = useUndo();
  return <WrappedView month={month} cards={wrappedCards(month, entries, moments, people)} onSave={async c => {
    try { await saveFile(await cardPng(c, look), `logbook-${month}-${c.kind}.png`); } catch (e) { undo.fail(e); } }} />;
}
