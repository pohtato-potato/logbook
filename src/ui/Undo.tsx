import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { StorageFullError, type Undo } from '../db/actions';

type Api = { show: (u: Undo, message?: string, opts?: { carry?: boolean }) => void; clear: () => void; moved: () => void; fail: (e: unknown) => void };
const Ctx = createContext<Api>({ show: () => {}, clear: () => {}, moved: () => {}, fail: () => {} });
export const useUndo = () => useContext(Ctx);
/* One notice at a time; it stays until the next action or screen, and Undo runs at most once.
   A notice shown just before the action itself moves you on (keeping a feeling returns to Today) is carried across that one move. */
export function UndoProvider({ children }: { children: ReactNode }) {
  const [cur, setCur] = useState<{ u: Undo | null; message: string } | null>(null), carry = useRef(false);
  const show = useCallback((u: Undo, message?: string, opts?: { carry?: boolean }) => { carry.current = !!opts?.carry; setCur({ u, message: message ?? u.label }); }, []);
  const clear = useCallback(() => setCur(null), []);
  const moved = useCallback(() => { if (carry.current) { carry.current = false; return; } setCur(null); }, []);
  /* A write that failed: say so plainly, with nothing to undo. */
  const fail = useCallback((e: unknown) => { carry.current = false; setCur({ u: null, message: e instanceof StorageFullError ? 'The phone is out of space, so that wasn’t saved. Nothing else changed.' : 'That didn’t save. Nothing else changed; try again.' }); }, []);
  const api = useMemo(() => ({ show, clear, moved, fail }), [show, clear, moved, fail]);
  return <Ctx.Provider value={api}>{children}
    {cur && <div className="toast" role={cur.u ? 'status' : 'alert'}><span>{cur.message}</span>{cur.u && <button type="button" className="btn sm" onClick={async () => { const u = cur.u!; setCur(null); try { await u.run(); } catch (e) { fail(e); } }}>Undo</button>}</div>}
  </Ctx.Provider>;
}
