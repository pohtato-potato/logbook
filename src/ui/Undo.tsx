import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { StorageFullError, type Undo } from '../db/actions';

type Api = { show: (u: Undo, message?: string, opts?: { carry?: boolean }) => void; clear: () => void; moved: () => void; fail: (e: unknown) => void; note: (message: string) => void };
const Ctx = createContext<Api>({ show: () => {}, clear: () => {}, moved: () => {}, fail: () => {}, note: () => {} });
export const useUndo = () => useContext(Ctx);
/* One notice at a time; it stays until the next action or screen, and Undo runs at most once.
   A notice shown just before the action itself moves you on (keeping a feeling returns to Today) is carried across that one move. */
/* What a failed save says: a known reason in its own words, anything else in general terms. */
export function failMessage(e: unknown): string {
  if (e instanceof StorageFullError) return 'The phone is out of space, so that wasn’t saved. Nothing else changed.';
  if ((e as Error)?.name === 'NotAnImageError' || (e as Error)?.name === 'PlainMessage') return (e as Error).message; // a known reason, already in plain words
  return 'That didn’t save. Nothing else changed; try again.';
}
export function UndoProvider({ children }: { children: ReactNode }) {
  const [cur, setCur] = useState<{ u: Undo | null; message: string; alert?: boolean } | null>(null), carry = useRef(false);
  const show = useCallback((u: Undo, message?: string, opts?: { carry?: boolean }) => { carry.current = !!opts?.carry; setCur({ u, message: message ?? u.label }); }, []);
  const clear = useCallback(() => setCur(null), []);
  const moved = useCallback(() => { if (carry.current) { carry.current = false; return; } setCur(null); }, []);
  /* A write that failed: say so plainly, with nothing to undo. */
  const fail = useCallback((e: unknown) => { carry.current = false; setCur({ u: null, message: failMessage(e), alert: true }); }, []);
  /* A plain notice that something finished, with nothing to undo. */
  const note = useCallback((message: string) => { carry.current = false; setCur({ u: null, message }); }, []);
  const api = useMemo(() => ({ show, clear, moved, fail, note }), [show, clear, moved, fail, note]);
  return <Ctx.Provider value={api}>{children}
    {cur && <div className="toast" role={cur.u || !cur.alert ? 'status' : 'alert'}><span>{cur.message}</span>{cur.u && <button type="button" className="btn sm" onClick={async () => { const u = cur.u!; setCur(null); try { await u.run(); } catch (e) { fail(e); } }}>Undo</button>}</div>}
  </Ctx.Provider>;
}
