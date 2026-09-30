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
type Lock = { credentialId: string; createdAt: number };
/* Closed while settings are still loading, and open only after an unlock of this very lock (a new lock starts closed). */
export function privacyState(lock: Lock | null | undefined, open: { at: number; credentialId: string } | null) {
  if (lock === undefined) return { enabled: true, locked: true };
  if (!lock) return { enabled: false, locked: false };
  return { enabled: true, locked: !(open && open.credentialId === lock.credentialId) };
}
const OPEN_FOR = 5 * 60_000;
/* Private entries stay closed until the owner unlocks; they close again after five minutes, or when the app goes to the background. */
export function PrivacyProvider({ children }: { children: ReactNode }) {
  const lock = useLiveQuery(async () => (await getSettings(db)).lock ?? null, []), undo = useUndo();
  const [openAt, setOpenAt] = useState<{ at: number; credentialId: string } | null>(null);
  const lockNow = useCallback(() => setOpenAt(null), []);
  useEffect(() => { const hide = () => { if (document.hidden) setOpenAt(null); }; document.addEventListener('visibilitychange', hide); return () => document.removeEventListener('visibilitychange', hide); }, []);
  useEffect(() => { if (openAt == null) return; const t = setTimeout(() => setOpenAt(null), Math.max(0, openAt.at + OPEN_FOR - Date.now())); return () => clearTimeout(t); }, [openAt]);
  const unlock = useCallback(async () => {
    if (!lock) return true;
    try { const ok = await askPhone(navigator.credentials, location.hostname, lock.credentialId);
      if (ok) setOpenAt({ at: Date.now(), credentialId: lock.credentialId });
      else undo.fail(Object.assign(new Error('Didn’t unlock. If your fingerprint or PIN changed, use Settings, Set up the lock again.'), { name: 'PlainMessage' }));
      return ok; } catch (e) { undo.fail(e); return false; }
  }, [lock, undo]);
  const value = useMemo(() => ({ ...privacyState(lock, openAt), unlock, lockNow }), [lock, openAt, unlock, lockNow]);
  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}
/* What a private entry shows while locked: that it exists, and a way to open it. */
const MARK_WORD = { first: 'First', gift: 'Gift', priv: 'Private', quiet: 'Don’t bring back' } as const;
export function LockedEntry({ time, marks = {} }: { time?: string; marks?: Partial<Record<keyof typeof MARK_WORD, boolean>> }) {
  const { unlock } = usePrivacy();
  return <div className="ent locked"><div className="ent-top"><div className="ent-body"><p className="entry"><Icon name="lock" /> {PRIVATE_TEXT}</p></div>
    <button type="button" className="btn sm" onClick={() => void unlock()}>Unlock</button></div><div className="ent-meta">{time && <span>{time}</span>}{(Object.keys(MARK_WORD) as (keyof typeof MARK_WORD)[]).filter(k => marks[k]).map(k => <span key={k} className="mpill">{MARK_WORD[k]}</span>)}</div></div>;
}
