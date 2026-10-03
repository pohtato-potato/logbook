import { useEffect, useState } from 'react';
import { db } from '../db/db';
import { dayKey } from '../domain/day';
import { handoverState, letGo, movedBackup, writeHandovers } from '../shelf/handover';
import { useUndo } from '../ui/Undo';

type State = { total: number; received: number; ready: boolean; private?: number };
/* Films, books and shows moving to Media (spec §12). Under way: how far, and where to finish. All arrived: first save a backup;
   only once the owner says it's in their downloads, let Logbook's copies go (with one Undo). Private entries stay. */
export function MediaMoveView({ state, done, busy, backedUp, onBackup, onLetGo }: { state: State; done?: number; busy?: boolean; backedUp?: boolean; onBackup?(): void; onLetGo(): void }) {
  const priv = state.private ? <p className="hint">{state.private} marked private {state.private === 1 ? 'stays' : 'stay'} here in Logbook.</p> : null;
  if (done) return <section className="panel mediamove" aria-label="Moved to Media"><p className="entry">{done} films, books and shows now live in Media.</p>{priv}</section>;
  if (!state.total) return null;
  if (!state.ready) return <section className="panel mediamove" aria-label="Moving to Media">
    <p className="entry">Films, books and shows are moving to Media: {state.received} of {state.total} have arrived.</p>
    <a className="btn ghost wide" href="../media/#/handover">Open Media to bring them in</a>{priv}
  </section>;
  return <section className="panel mediamove" aria-label="Moving to Media">
    <p className="entry">All {state.total} films, books and shows are safely in Media.</p>
    {!backedUp ? <>
      <p className="hint">First, save a backup of Logbook’s copies. Nothing is removed yet.</p>
      <button type="button" className="btn primary wide" onClick={onBackup}>Save a backup</button>
    </> : <>
      <p className="entry">Is the backup in your downloads? Then Logbook can let its copies go. You can undo it right after.</p>
      <button type="button" className="btn primary wide" disabled={busy} onClick={onLetGo}>{busy ? 'Letting go…' : 'Yes, let them go'}</button>
      <button type="button" className="btn ghost wide" onClick={onBackup}>Save the backup again</button>
    </>}
    {priv}
  </section>;
}

/* On Today: writes the hand-over cards on opening and shows how far the move has got. */
export function MediaMove() {
  const undo = useUndo();
  const [state, setState] = useState<State>({ total: 0, received: 0, ready: false }), [busy, setBusy] = useState(false), [done, setDone] = useState(0), [backedUp, setBackedUp] = useState(false);
  useEffect(() => {
    const check = async () => { try { await writeHandovers(db); setState(await handoverState(db)); } catch { /* the shelf can be busy; next time */ } };
    const onVisible = () => { if (!document.hidden) void check(); };
    void check(); document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
  const backup = async () => {
    const entries = await db.entries.where('kind').equals('media').toArray();
    const a = document.createElement('a'); a.href = URL.createObjectURL(movedBackup(entries)); a.download = `logbook-media-handover-${dayKey(new Date())}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setBackedUp(true);
  };
  const go = async () => {
    setBusy(true);
    try {
      const r = await letGo(db); setDone(r.count); setState(await handoverState(db));
      undo.show(r.undo, `${r.count} moved to Media. Logbook’s copies are gone; undo brings them back.`);
    } catch (e) { undo.fail(e); } finally { setBusy(false); }
  };
  return <MediaMoveView state={state} done={done} busy={busy} backedUp={backedUp} onBackup={() => void backup()} onLetGo={() => void go()} />;
}
