import type { DayStamps, Person, Span } from '../db/types';
import { addDays, parseDay, timeLabelIn, timeZone } from './day';
import { dayLengthMin, dayLengthWords, moonOf, sunTimes } from './sun';
import { airWords, weatherWords } from './aqi';
import { nextBirthday } from './birthday';

export type Home = { name: string; lat: number; lon: number; from: string; to?: string };
export type Pos = { lat: number; lon: number; source: 'here' | 'place' | 'home' };
const DAY = 86400000, daysBetween = (a: string, b: string) => Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / DAY);
/* Great-circle distance in km. */
export function haversineKm(a: number, b: number, c: number, d: number): number {
  const R = 6371, r = Math.PI / 180, x = Math.sin(((c - a) * r) / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(((d - b) * r) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
/* The home lived in on a day: the one whose dates cover it, else the latest one begun before it. */
export function homeOn(homes: Home[], day: string): Home | undefined {
  return homes.find(h => h.from <= day && (!h.to || day <= h.to)) ?? [...homes].filter(h => h.from <= day).sort((a, b) => b.from.localeCompare(a.from))[0];
}
/* Where a day was: where the owner said, else a place kept that day with a position, else the home of that date. */
export function dayPosition(day: string, stamps: DayStamps | undefined, placesThatDay: { lat: number; lon: number }[], homes: Home[]): Pos | null {
  if (stamps?.where) return { ...stamps.where, source: 'here' };
  const p = placesThatDay.at(-1); if (p) return { lat: p.lat, lon: p.lon, source: 'place' };
  const h = homeOn(homes, day); return h ? { lat: h.lat, lon: h.lon, source: 'home' } : null;
}
/* "A different home each day until every home has had a turn" (spec, section 9). */
export const homeForDistance = (homes: Home[], day: string) => (homes.length ? homes[Math.floor(parseDay(day).getTime() / DAY) % homes.length] : undefined);
export const weatherLine = (w: { code: number; max: number; min: number; rain: number }) =>
  `${weatherWords(w.code)}, ${Math.round(w.max)}° by day, ${Math.round(w.min)}° at night${w.rain >= 0.5 ? `, ${Math.round(w.rain)} mm rain` : ''}`;
/* A day's stamps, in the approved order, in words. Anything unknown is simply left out. */
export function stampList(i: { day: string; today: string; stamps?: DayStamps; pos: Pos | null; homes: Home[]; people: Person[]; spans: Span[] }): [string, string][] {
  const out: [string, string][] = [], w = i.stamps?.weather, a = i.stamps?.air, tz = timeZone();
  if (w) out.push(['Outside', weatherLine(w)]);
  if (a) out.push(['Air outside', airWords(a)]);
  if (i.pos) {
    const s = sunTimes(i.day, i.pos.lat, i.pos.lon);
    out.push(['Sun', s === 'up-all-day' ? 'The sun doesn’t set today' : s === 'down-all-day' ? 'The sun doesn’t rise today' : `rise ${timeLabelIn(s.rise, tz)}, set ${timeLabelIn(s.set, tz)}`]);
    const len = dayLengthMin(i.day, i.pos.lat, i.pos.lon);
    if (len != null) out.push(['Day length', dayLengthWords(len, dayLengthMin(addDays(i.day, -1), i.pos.lat, i.pos.lon))]);
  }
  out.push(['Moon', moonOf(parseDay(i.day).getTime()).words]);
  const special = [...i.people.filter(p => nextBirthday(p.birthday, i.day)?.inDays === 0).map(p => `${p.name}’s birthday`),
    ...i.spans.filter(s => s.from <= i.day && i.day <= s.to).map(s => `Day ${daysBetween(s.from, i.day) + 1} of ${s.name}`)];
  if (special.length) out.push(['Today is', special.join(' · ')]);
  const far = homeForDistance(i.homes, i.day);
  if (far && i.pos && i.pos.source !== 'home') out.push(['From home', `${Math.round(haversineKm(i.pos.lat, i.pos.lon, far.lat, far.lon))} km from ${far.name}`]);
  const here = homeOn(i.homes, i.day); if (here) out.push(['At this home', `${daysBetween(here.from, i.day) + 1} days`]);
  const next = [...i.spans].filter(s => s.from > i.today).sort((x, y) => x.from.localeCompare(y.from))[0];
  if (next && i.day === i.today) out.push(['Next trip', `${next.name}, in ${daysBetween(i.today, next.from)} days`]);
  return out;
}
