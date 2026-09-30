import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { getSettings } from '../db/actions';
import { ensureStamps, placesOn } from '../db/stamps';
import { fetchJson } from '../sources/http';
import { dayKey } from '../domain/day';
import { dayPosition, stampList } from '../domain/stamps';
import type { StampStatus } from '../screens/Stamps';

/* One refresh per day at a time, shared by every screen showing it (and by React's double run in development). */
const inflight = new Map<string, ReturnType<typeof ensureStamps>>();
const refresh = (day: string, again = false): ReturnType<typeof ensureStamps> => { let p = inflight.get(day);
  if (p && again) return p.then(() => refresh(day)); // the place just changed: ask again once the current round is done
  if (!p) { p = ensureStamps(db, day, new Date(), fetchJson).finally(() => inflight.delete(day)); inflight.set(day, p); } return p; };
/* A day's stamps: shown from the cache at once, refreshed in the background when the day opens and when the phone comes back online. */
export function useStamps(day: string) {
  const [status, setStatus] = useState<StampStatus>('loading'), [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true; const run = () => { void refresh(day, tick > 0).then(s => { if (live) setStatus(s); }); };
    run(); addEventListener('online', run); return () => { live = false; removeEventListener('online', run); };
  }, [day, tick]);
  const d = useLiveQuery(async () => {
    const [row, settings, people, spans] = await Promise.all([db.days.get(day), getSettings(db), db.people.toArray(), db.spans.toArray()]);
    const pos = dayPosition(day, row?.stamps, await placesOn(db, day), settings.homes);
    return { pos, list: stampList({ day, today: dayKey(new Date()), stamps: row?.stamps, pos, homes: settings.homes, people, spans }) };
  }, [day]);
  return { status, list: d?.list ?? [], pos: d?.pos ?? null, refresh: () => setTick(t => t + 1) };
}
