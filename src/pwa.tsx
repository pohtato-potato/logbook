import { useSyncExternalStore } from 'react';

/* The service worker keeps Logbook opening without a connection. A new version waits until the owner taps Update,
   so a half-written line is never lost to a reload. */
type Opts = { onNeedRefresh?: () => void; onRegisteredSW?: (url: string, reg: ServiceWorkerRegistration | undefined) => void };
type Register = (o: Opts) => (reload?: boolean) => Promise<void>;
let state = { needRefresh: false }, update: ((reload?: boolean) => Promise<void>) | undefined;
const listeners = new Set<() => void>();
export const pwaState = () => state;
export const usePwa = () => useSyncExternalStore(l => { listeners.add(l); return () => listeners.delete(l); }, pwaState, pwaState);
export async function initPwa(load: () => Promise<Register> = async () => (await import('virtual:pwa-register')).registerSW, prod = import.meta.env.PROD && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  if (!prod) return;
  const registerSW = await load();
  update = registerSW({
    onNeedRefresh: () => { state = { needRefresh: true }; listeners.forEach(l => l()); },
    onRegisteredSW: (_u, reg) => { if (reg) document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); }); },
  });
}
export const applyUpdate = () => update?.(true);
export function UpdateNoticeView({ onUpdate }: { onUpdate(): void }) {
  return <div className="toast update" role="status"><span>A new version of Logbook is ready.</span><button type="button" className="btn sm" onClick={onUpdate}>Update</button></div>;
}
export function UpdateNotice() { return usePwa().needRefresh ? <UpdateNoticeView onUpdate={() => void applyUpdate()} /> : null; }
