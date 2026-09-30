import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Undo } from '../db/actions';

type Api = { show: (u: Undo, message?: string, opts?: { carry?: boolean }) => void; clear: () => void; moved: () => void };
const Ctx = createContext<Api>({ show: () => {}, clear: () => {}, moved: () => {} });
export const useUndo = () => useContext(Ctx);
/* One notice at a time; it stays until the next action or screen, and Undo runs at most once.
   A notice shown just before the action itself moves you on (keeping a feeling returns to Today) is carried across that one move. */
export function UndoProvider({ children }: { children: ReactNode }) {
  const [cur, setCur] = useState<{ u: Undo; message: string } | null>(null), carry = useRef(false);
  const show = useCallback((u: Undo, message?: string, opts?: { carry?: boolean }) => { carry.current = !!opts?.carry; setCur({ u, message: message ?? u.label }); }, []);
  const clear = useCallback(() => setCur(null), []);
  const moved = useCallback(() => { if (carry.current) { carry.current = false; return; } setCur(null); }, []);
  const api = useMemo(() => ({ show, clear, moved }), [show, clear, moved]);
  return <Ctx.Provider value={api}>{children}
    {cur && <div className="toast" role="status"><span>{cur.message}</span><button type="button" className="btn sm" onClick={async () => { const u = cur.u; setCur(null); await u.run(); }}>Undo</button></div>}
  </Ctx.Provider>;
}
