import { parseDay } from './day';

const DAY = 86400000;
/* A birthday stored as MM-DD: its next date on or after today, and how many days away. */
export function nextBirthday(mmdd: string | undefined, today: string): { day: string; inDays: number } | null {
  if (!mmdd || !/^\d{2}-\d{2}$/.test(mmdd)) return null;
  const y = Number(today.slice(0, 4)), at = (yr: number) => `${yr}-${mmdd}`, day = at(y) >= today ? at(y) : at(y + 1);
  return { day, inDays: Math.round((parseDay(day).getTime() - parseDay(today).getTime()) / DAY) };
}
