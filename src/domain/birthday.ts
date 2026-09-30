import { parseDay } from './day';

const DAY = 86400000;
/* A birthday stored as MM-DD: its next date on or after today, and how many days away. */
export function nextBirthday(mmdd: string | undefined, today: string): { day: string; inDays: number } | null {
  if (!mmdd || !/^\d{2}-\d{2}$/.test(mmdd)) return null;
  const leap = (yr: number) => (yr % 4 === 0 && yr % 100 !== 0) || yr % 400 === 0;
  const y = Number(today.slice(0, 4)), at = (yr: number) => (mmdd === '02-29' && !leap(yr) ? `${yr}-02-28` : `${yr}-${mmdd}`), day = at(y) >= today ? at(y) : at(y + 1);
  return { day, inDays: Math.round((parseDay(day).getTime() - parseDay(today).getTime()) / DAY) };
}
