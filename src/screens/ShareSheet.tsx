import { useState } from 'react';
import { db } from '../db/db';
import { keepEntry } from '../db/actions';
import { hostOf } from '../domain/entryText';
import { clearShare, safeUrl, setMediaPrefill, shareToEntry, takeShare, type Shared } from '../share';
import { Icon } from '../ui/Icons';
import { useUndo } from '../ui/Undo';
import { go } from '../router';

export type ShareAs = 'watched' | 'link' | 'quote';
const KEEP: Record<ShareAs, string> = { watched: 'Rate it and keep it', link: 'Keep this link', quote: 'Keep this quote' };
/* Something shared from another app: keep it as watched, as a link, or as a quote, with a line of your own. Nothing is fetched. */
export function ShareSheetView({ shared, as, line, onAs, onLine, onKeep, onCancel }: { shared: Shared | null; as: ShareAs; line: string; onAs(a: ShareAs): void; onLine(l: string): void; onKeep(): void; onCancel(): void }) {
  if (!shared) return <div className="scr"><div className="content scroll"><header className="thead"><h1 className="tdate sm">Keep in Logbook</h1></header>
    <p className="entry">Nothing was shared, or it didn’t arrive. Share from another app again.</p><button type="button" className="btn wide" onClick={onCancel}>Go to Today</button></div></div>;
  const safe = safeUrl(shared.url), host = hostOf(shared.url), ways: [ShareAs, string][] = [['watched', 'Watched'], ['link', 'A link'], ...(shared.text ? [['quote', 'A quote'] as [ShareAs, string]] : [])];
  return <div className="scr"><div className="content scroll">
    <header className="thead row2"><button type="button" className="back" aria-label="Cancel" onClick={onCancel}><Icon name="close" /></button><h1 className="tdate sm">Keep in Logbook</h1></header>
    <section className="panel sharesheet">
      <div className="linkcard"><span className="addico" aria-hidden="true"><Icon name="k-media" /></span><div><b>{shared.title || (shared.text ? shared.text.slice(0, 80) : host) || 'Something shared'}</b>
        <span>{safe ? host : shared.url ? 'An address Logbook won’t open' : 'Shared text'}</span></div></div>
      {shared.text && shared.title && <p className="hint">“{shared.text.slice(0, 200)}{shared.text.length > 200 ? '…' : ''}”</p>}
      <p className="subl">Keep it as</p>
      <div className="chips" role="group" aria-label="Keep it as">{ways.map(([k, l]) => <button key={k} type="button" className={'chip' + (as === k ? ' on ink' : '')} aria-pressed={as === k} onClick={() => onAs(k)}>{l}</button>)}</div>
      <label className="field"><span>Your line (optional)</span><input className="sinput" value={line} onChange={e => onLine(e.target.value)} /></label>
    </section></div>
    <div className="pinbar"><button type="button" className="btn primary big" onClick={onKeep}><span>{KEEP[as]}</span></button></div></div>;
}
export function ShareSheet() {
  const undo = useUndo(), [shared] = useState(takeShare), [as, setAs] = useState<ShareAs>(() => (shared?.url ? 'link' : shared?.text ? 'quote' : 'link')), [line, setLine] = useState('');
  const done = () => { clearShare(); go({ name: 'today' }); };
  return <ShareSheetView shared={shared} as={as} line={line} onAs={setAs} onLine={setLine} onCancel={done} onKeep={async () => {
    if (!shared) return done();
    const k = shareToEntry(shared, as, line);
    if ('media' in k) { setMediaPrefill(k.media); clearShare(); go({ name: 'form', kind: 'media' }); return; }
    try {
      const r = await keepEntry(db, { ...k, at: new Date() });
      undo.show(r.undo, 'Kept in today.', { carry: true }); done();
    } catch (e) { undo.fail(e); }
  }} />;
}
