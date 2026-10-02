import type { CSSProperties } from 'react';
import { parseDay } from '../domain/day';
import type { Postcard } from '../sources/shelf';

/* Health's postcard for yesterday, drawn in Health's own ink, rings and colours (and its night colours after 11 pm). Every ring is also said in words. */
const DAY = { bg: '#151821', edge: '#272c37', text: '#ede9e3', quiet: '#a3a1a8', apricot: '#e9a77c', sage: '#8fc9b0', lav: '#b7a6f0' };
const NIGHT = { bg: '#121016', edge: '#221e26', text: '#d8cfc3', quiet: '#a79d94', apricot: '#c99173', sage: '#7fae99', lav: '#9d90cc' };
const pct = (x: number) => (x >= 1 ? 'closed' : `${Math.round(x * 100)}%`);
const hm = (m: number) => `${Math.floor(m / 60)} h ${Math.round(m % 60)} m`;
export function PostcardView({ card, night }: { card: Postcard; night: boolean }) {
  const C = night ? NIGHT : DAY, day = parseDay(card.day).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric' });
  const ring = (r: number, p: number, col: string) => { const c = 2 * Math.PI * r; return <g key={r}><circle cx="50" cy="50" r={r} fill="none" stroke={col} strokeOpacity=".16" strokeWidth="8" />
    <circle cx="50" cy="50" r={r} fill="none" stroke={col} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(Math.min(1, p) * c).toFixed(1)} ${c.toFixed(1)}`} transform="rotate(-90 50 50)" /></g>; };
  const row = (col: string, k: string, v: string) => <div key={k} className="hp-row"><i style={{ background: col }} aria-hidden="true" /><span>{k}</span><b>{v}</b></div>;
  return <section className="hpost" style={{ '--hp-bg': C.bg, '--hp-edge': C.edge, '--hp-text': C.text, '--hp-quiet': C.quiet } as CSSProperties} aria-label="Postcard from Health">
    <div className="hp-head"><span>Postcard from Health</span><span>for yesterday, {day}</span></div>
    <div className="hp-body"><svg viewBox="0 0 100 100" className="hp-rings" role="img" aria-label={`Health’s three rings: workout ${pct(card.rings.workout)}, sleep ${pct(card.rings.sleep)}, steps ${pct(card.rings.steps)}`}>
      {ring(42, card.rings.workout, C.apricot)}{ring(30, card.rings.sleep, C.lav)}{ring(18, card.rings.steps, C.sage)}</svg>
      <div className="hp-nums">{card.steps != null && <p><b style={{ color: C.sage }}>{card.steps.toLocaleString('en-GB')}</b> steps</p>}{card.sleepMin != null && <p><b style={{ color: C.lav }}>{hm(card.sleepMin)}</b> sleep</p>}</div></div>
    <div className="hp-list">
      {row(C.apricot, 'Workout', card.workout ? `${card.workout.name}, ${card.workout.minutes} min` : 'A rest day')}
      {card.checkin && row(C.sage, 'Check-in', `Done at ${new Date(card.checkin.at).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s/g, ' ')}`)}
      {card.walk && row(C.lav, 'India walk', `${Math.round(card.walk.km)} km, at ${card.walk.place}${card.walk.next ? `, on to ${card.walk.next}` : ''}`)}
    </div>
    {card.line && <p className="hp-q">“{card.line}”</p>}
    <p className="hp-note">Each day’s postcard arrives the next afternoon, once the day is really over.</p>
  </section>;
}
