import { useEffect, useState } from 'react';
import { db } from '../db/db';
import { dayKey } from '../domain/day';
import { handoverState, letGo, movedBackup, writeHandovers } from '../shelf/handover';

type State = { total: number; received: number; ready: boolean };
/* Films, books and shows moving to Media (spec §12). Under way: how far, and where to finish. All arrived: save a backup, then let go. */
export function MediaMoveView({ state, done, busy, onLetGo }: { state: State; done?: number; busy?: boolean; onLetGo(): void }) {
  if (done) return <section className="panel mediamove" aria-label="Moved to Media"><p className="entry">{done} films, books and shows now live in Media. The backup of Logbook’s copies is in your downloads.</p></section>;
  if (!state.total) return null;
  if (!state.ready) return <section className="panel mediamove" aria-label="Moving to Media">
    <p className="entry">Films, books and shows are moving to Media: {state.received} of {state.total} have arrived.</p>
    <a className="btn ghost wide" href="../media/#/handover">Open Media to bring them in</a>
  </section>;
  return <section className="panel mediamove" aria-label="Moving to Media">
    <p className="entry">All {state.total} films, books and shows are safely in Media. Logbook can save a backup of its copies, then let them go.</p>
    <button type="button" className="btn primary wide" disabled={busy} onClick={onLetGo}>{busy ? 'Saving the backup…' : 'Save a backup and let them go'}</button>
  </section>;
}

/* On Today: writes the hand-over cards on opening and shows how far the move has got. */
export function MediaMove() {
  const [state, setState] = useState<State>({ total: 0, received: 0, ready: false }), [busy, setBusy] = useState(false), [done, setDone] = useState(0);
  useEffect(() => {
    const check = async () => { try { await writeHandovers(db); setState(await handoverState(db)); } catch { /* the shelf can be busy; next time */ } };
    const onVisible = () => { if (!document.hidden) void check(); };
    void check(); document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
  const go = async () => {
    setBusy(true);
    try {
      const entries = (await db.entries.where('kind').equals('media').toArray());
      const a = document.createElement('a'); a.href = URL.createObjectURL(movedBackup(entries)); a.download = `logbook-media-handover-${dayKey(new Date())}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      const n = await letGo(db); setDone(n); setState(await handoverState(db));
    } finally { setBusy(false); }
  };
  return <MediaMoveView state={state} done={done} busy={busy} onLetGo={() => void go()} />;
}
