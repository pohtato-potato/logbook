import type { Entry } from '../db/types';
/* Days in a year with anything naming the person (an @ in a line, a call, a quote), the last such day, and a count per month. */
export function togetherStats(initial: string, entries: Entry[], year: number): { days: number; last?: string; byMonth: number[] } {
  const days = [...new Set(entries.filter(e => e.people.includes(initial) && e.day.startsWith(String(year))).map(e => e.day))].sort();
  const byMonth = Array(12).fill(0) as number[]; days.forEach(d => byMonth[Number(d.slice(5, 7)) - 1]++);
  return days.length ? { days: days.length, last: days[days.length - 1], byMonth } : { days: 0, byMonth };
}
