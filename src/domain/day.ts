/* A day ends at 4 am: anything before then belongs to the day before. All dates are local. */
export const DAY_ENDS_AT_HOUR = 4;
const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function dayKey(at: Date): string {
  const d = new Date(at.getTime());
  if (d.getHours() < DAY_ENDS_AT_HOUR) d.setDate(d.getDate() - 1);
  return ymd(d);
}
/* Today's quiet night layout runs from 12 am to 5 am. */
export function isNight(at: Date): boolean {
  return at.getHours() < 5;
}
export function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number), out = new Date(2000, 0, 1, 12, 0, 0);
  out.setFullYear(y, m - 1, d); // setFullYear keeps years below 100 as they are
  return out;
}
/* The calendar date of a moment, in local time (no 4 am rule): for "written on". */
export const localDate = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export function addDays(day: string, n: number): string {
  const d = parseDay(day);
  d.setDate(d.getDate() + n);
  return ymd(d);
}
export function weekStartOf(day: string): string {
  const back = (parseDay(day).getDay() + 6) % 7; // Monday = 0
  return addDays(day, -back);
}
export function timeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}
/* The time as it was where the entry was written (its stored time zone). */
export function timeLabelIn(at: number, tz: string): string {
  let parts: Intl.DateTimeFormatPart[];
  try { parts = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hourCycle: 'h12', timeZone: tz }).formatToParts(new Date(at)); }
  catch { return timeLabel(new Date(at)); }
  const get = (t: string) => parts.find(x => x.type === t)?.value ?? '';
  const h = Number(get('hour')) % 12 || 12, ap = get('dayPeriod').toLowerCase().replace(/\./g, '');
  return `${h}:${get('minute')} ${ap}`;
}
export function timeLabel(at: Date): string {
  const h = at.getHours(), m = at.getMinutes();
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${h < 12 ? 'am' : 'pm'}`;
}
