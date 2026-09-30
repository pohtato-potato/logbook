import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Undo } from '../db/actions';

type Api = { show: (u: Undo, message?: string) => void; clear: () => void };
const Ctx = createContext<Api>({ show: () => {}, clear: () => {} });
export const useUndo = () => useContext(Ctx);
/* One notice at a time; it stays until the next action, and Undo runs at most once. */
export function UndoProvider({ children }: { children: ReactNode }) {
  const [cur, setCur] = useState<{ u: Undo; message: string } | null>(null);
  const show = useCallback((u: Undo, message?: string) => setCur({ u, message: message ?? u.label }), []);
  const clear = useCallback(() => setCur(null), []);
  const api = useMemo(() => ({ show, clear }), [show, clear]);
  return <Ctx.Provider value={api}>{children}
    {cur && <div className="toast" role="status"><span>{cur.message}</span><button type="button" className="btn sm" onClick={async () => { const u = cur.u; setCur(null); await u.run(); }}>Undo</button></div>}
  </Ctx.Provider>;
}
