import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { getSettings } from '../db/actions';
import { unlock as askPhone } from '../domain/lock';
import { PRIVATE_TEXT } from '../domain/looking';
import { Icon } from './Icons';
import { useUndo } from './Undo';

export type Privacy = { enabled: boolean; locked: boolean; unlock(): Promise<boolean>; lockNow(): void };
export const PrivacyContext = createContext<Privacy>({ enabled: false, locked: false, unlock: async () => true, lockNow: () => {} });
export const usePrivacy = () => useContext(PrivacyContext);
const OPEN_FOR = 5 * 60_000;
/* Private entries stay closed until the owner unlocks; they close again after five minutes, or when the app goes to the background. */
export function PrivacyProvider({ children }: { children: ReactNode }) {
  const lock = useLiveQuery(async () => (await getSettings(db)).lock ?? null, []), undo = useUndo();
  const [openAt, setOpenAt] = useState<number | null>(null);
  const lockNow = useCallback(() => setOpenAt(null), []);
  useEffect(() => { const hide = () => { if (document.hidden) setOpenAt(null); }; document.addEventListener('visibilitychange', hide); return () => document.removeEventListener('visibilitychange', hide); }, []);
  useEffect(() => { if (openAt == null) return; const t = setTimeout(() => setOpenAt(null), Math.max(0, openAt + OPEN_FOR - Date.now())); return () => clearTimeout(t); }, [openAt]);
  const unlock = useCallback(async () => {
    if (!lock) return true;
    try { const ok = await askPhone(navigator.credentials, location.hostname, lock.credentialId); if (ok) setOpenAt(Date.now()); return ok; } catch (e) { undo.fail(e); return false; }
  }, [lock, undo]);
  const value = useMemo(() => ({ enabled: !!lock, locked: !!lock && openAt == null, unlock, lockNow }), [lock, openAt, unlock, lockNow]);
  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}
/* What a private entry shows while locked: that it exists, and a way to open it. */
export function LockedEntry({ time }: { time?: string }) {
  const { unlock } = usePrivacy();
  return <div className="ent locked"><div className="ent-top"><div className="ent-body"><p className="entry"><Icon name="lock" /> {PRIVATE_TEXT}</p></div>
    <button type="button" className="btn sm" onClick={() => void unlock()}>Unlock</button></div>{time && <div className="ent-meta"><span>{time}</span></div>}</div>;
}
