/* Sunrise and sunset from the NOAA sunrise equation, and the moon from its mean cycle. All on the phone; nothing is fetched. */
const RAD = Math.PI / 180, J2000 = 2451545, DAY = 86400000;
const toJ = (ms: number) => ms / DAY + 2440587.5, fromJ = (j: number) => (j - 2440587.5) * DAY;
export function sunTimes(day: string, lat: number, lon: number): { rise: number; set: number } | 'up-all-day' | 'down-all-day' {
  const [y, m, d] = day.split('-').map(Number), noon = Date.UTC(y, m - 1, d, 12);
  const n = Math.round(toJ(noon) - J2000 + 0.0008), Js = n - lon / 360;
  const M = (357.5291 + 0.98560028 * Js) % 360, C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD);
  const L = (M + C + 180 + 102.9372) % 360, Jt = J2000 + Js + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * L * RAD);
  const sd = Math.sin(L * RAD) * Math.sin(23.4397 * RAD), cd = Math.cos(Math.asin(sd));
  const cw = (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * sd) / (Math.cos(lat * RAD) * cd);
  if (cw < -1) return 'up-all-day'; if (cw > 1) return 'down-all-day';
  const w = Math.acos(cw) / RAD / 360;
  return { rise: fromJ(Jt - w), set: fromJ(Jt + w) };
}
export function dayLengthMin(day: string, lat: number, lon: number): number | null { const s = sunTimes(day, lat, lon); return typeof s === 'string' ? null : Math.round((s.set - s.rise) / 60000); }
export function dayLengthWords(today: number, yesterday: number | null): string {
  const base = `${Math.floor(today / 60)} h ${today % 60} m`; if (yesterday == null) return base;
  const diff = today - yesterday, n = Math.abs(diff);
  return `${base}, ${diff === 0 ? 'about the same' : `${n === 1 ? 'a minute' : `${n} minutes`} ${diff > 0 ? 'longer' : 'shorter'}`}`;
}
const SYNODIC = 29.530588853, NEW_REF = 2451550.1;
export function moonOf(atMs: number) {
  const age = (((toJ(atMs) - NEW_REF) % SYNODIC) + SYNODIC) % SYNODIC, lit = (1 - Math.cos((2 * Math.PI * age) / SYNODIC)) / 2, pct = Math.round(lit * 100);
  const words = age < 1.5 || age > SYNODIC - 1.5 ? 'New moon' : Math.abs(age - SYNODIC / 2) < 1.2 ? 'Full moon' : `${age < SYNODIC / 2 ? 'Waxing' : 'Waning'}, ${pct}% lit`;
  return { age, lit, words };
}
