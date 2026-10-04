import type { Entry, Person } from '../db/types';
/* Days in a year with anything naming the person (an @ in a line, a call, a quote), the last such day, and a count per month. */
export function togetherStats(initial: string, entries: Entry[], year: number): { days: number; last?: string; byMonth: number[] } {
  const days = [...new Set(entries.filter(e => e.people.includes(initial) && e.day.startsWith(String(year))).map(e => e.day))].sort();
  const byMonth = Array(12).fill(0) as number[]; days.forEach(d => byMonth[Number(d.slice(5, 7)) - 1]++);
  return days.length ? { days: days.length, last: days[days.length - 1], byMonth } : { days: 0, byMonth };
}

/* People are mentioned with @ and a short handle of 1 to 3 letters, written like @Ri. A handle of one letter works as it
   always did, so lines kept before handles grew longer still point at the same person. */
export const normHandle = (s: string) => { const l = s.replace(/[^A-Za-z]/g, '').slice(0, 3); return l ? l[0].toUpperCase() + l.slice(1).toLowerCase() : ''; };
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
/* A first guess for a new person's handle that nobody else has: R, then Ri, then R and their second name's letter, then Riy. */
export function suggestHandle(name: string, taken: string[]): string {
  const words = name.trim().split(/\s+/).map(w => w.replace(/[^A-Za-z]/g, '')).filter(Boolean); if (!words.length) return '';
  const w = words[0], options = [w.slice(0, 1), w.slice(0, 2), words[1] ? w[0] + words[1][0] : '', w.slice(0, 3)].map(normHandle).filter(Boolean);
  return options.find(o => !taken.some(t => same(t, o))) ?? '';
}
/* What @word points at: the longest handle the word starts with; otherwise its first letter, as before. */
export function matchHandle(word: string, handles: string[]): string {
  const best = handles.filter(h => h && word.toLowerCase().startsWith(h.toLowerCase())).sort((a, b) => b.length - a.length)[0];
  return best ?? word.slice(0, 1).toUpperCase();
}
const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const validBirthday = (mmdd: string) => { const m = /^(\d{2})-(\d{2})$/.exec(mmdd); if (!m) return false; const mo = Number(m[1]), d = Number(m[2]); return mo >= 1 && mo <= 12 && d >= 1 && d <= MONTH_DAYS[mo - 1]; };
export type PersonDraft = { name: string; handle: string; birthday?: string };
/* What's wrong with a person before they're kept, in plain words; null when all is well. */
export function checkPerson(d: PersonDraft, others: Person[]): string | null {
  if (!d.name.trim()) return 'Give them a name.';
  const h = normHandle(d.handle); if (!h) return 'Give them a short name of 1 to 3 letters, for @.';
  const clash = others.find(o => same(o.initial, h)); if (clash) return `@${h} is already ${clash.name}. Pick other letters.`;
  if (d.birthday && !validBirthday(d.birthday)) return 'That birthday isn’t a real date.';
  return null;
}
