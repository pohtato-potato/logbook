import { useEffect, useRef } from 'react';
import { usePrivacy } from './Privacy';
import { onLocalChange } from '../db/syncMeta';
import { runSync } from './syncNow';

/* Syncs by itself while this session is signed in to Google (after a Sync now or a Drive backup): soon after opening,
   on coming back to the front, every five minutes, and half a minute after a change. Never while private entries are locked.
   Silent; Settings shows the last sync. */
export function AutoSync() {
  const { locked } = usePrivacy(), lock = useRef(locked); lock.current = locked;
  useEffect(() => {
    let soon: number | undefined;
    const go = () => { void runSync(false, { locked: lock.current }).catch(() => { /* offline or signed out: the next try, or Sync now, says so */ }); };
    onLocalChange(() => { clearTimeout(soon); soon = window.setTimeout(go, 30_000); });
    const first = window.setTimeout(go, 3000), every = window.setInterval(go, 5 * 60_000);
    const back = () => { if (document.visibilityState === 'visible') go(); };
    document.addEventListener('visibilitychange', back);
    return () => { onLocalChange(null); clearTimeout(soon); clearTimeout(first); clearInterval(every); document.removeEventListener('visibilitychange', back); };
  }, []);
  return null;
}
