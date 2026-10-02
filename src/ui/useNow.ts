import { useEffect, useState } from 'react';
import { dayKey, isNight } from '../domain/day';

/* What Today depends on: the logical day (it turns at 4 am), night mode (12 to 5 am), and 11 pm, when Health's postcard takes its night colours. */
export const clockKey = (d: Date): string => `${dayKey(d)}|${isNight(d) ? 'night' : 'day'}|${d.getHours() >= 23 ? 'late' : ''}`;
/* The current time, refreshed each minute and whenever the app comes back to the front,
   so Today moves on to the new day and out of night mode without a reload. Re-renders only when clockKey changes. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(prev => { const next = new Date(); return clockKey(next) === clockKey(prev) ? prev : next; });
    const id = setInterval(tick, 60_000);
    const onShow = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onShow);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onShow); };
  }, []);
  return now;
}
