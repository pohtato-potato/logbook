import type { Family } from '../vocab/vocab';
import { FAMILIES, FAMILY_NAME } from '../vocab/vocab';
import { dot, drawSmall, rgba, type Look } from './forms';

type Ctx = CanvasRenderingContext2D;
export type YearDay = { day: string; family?: Family; v: number };
const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
export const monthLengths = (year: number) => [31, leap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const starts = (lens: number[]) => lens.reduce<number[]>((acc, _len, i) => (acc.push(i ? acc[i - 1] + lens[i - 1] : 0), acc), []);
const yearOf = (days: YearDay[]) => Number(days[0]?.day.slice(0, 4) ?? 2000);
const FONT = "700 14px 'Atkinson Hyperlegible', sans-serif";

/* The ring: one spoke per day, a small gap between months, noon of 1 January at the top. */
export function ringGeom(w: number, h: number, days: YearDay[]) {
  const n = days.length, m = Math.min(w, h), gap = 0.014, st = starts(monthLengths(yearOf(days)));
  const monthOf = (i: number) => { let mo = 0; while (mo < 11 && st[mo + 1] <= i) mo++; return mo; };
  const span = Math.PI * 2 - gap * 12;
  return { cx: w / 2, cy: h / 2, R0: m * 0.23, L: m * 0.17, n, st, angOf: (i: number) => -Math.PI / 2 + ((i + 0.5) / n) * span + gap * (monthOf(Math.floor(i)) + 0.5) };
}
/* Which day a tap on the ring means, or -1 for the middle or outside. */
export function ringHit(x: number, y: number, w: number, h: number, days: YearDay[]): number {
  const g = ringGeom(w, h, days), d = Math.hypot(x - g.cx, y - g.cy);
  if (d < g.R0 * 0.45 || d > g.R0 + g.L + 40) return -1;
  const a = Math.atan2(y - g.cy, x - g.cx); let best = -1, bd = 9;
  for (let i = 0; i < g.n; i++) { const da = Math.abs(((((g.angOf(i) - a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (da < bd) { bd = da; best = i; } }
  return best;
}
export function drawYearRing(ctx: Ctx, look: Look, w: number, h: number, days: YearDay[], today: number, pick: number) {
  const G = look.ground, P = look.pal, g = ringGeom(w, h, days), { cx, cy, R0, L } = g, kept = days.filter(d => d.family);
  const main = FAMILIES.map(f => [f, kept.filter(d => d.family === f).length] as const).sort((a, b) => b[1] - a[1])[0];
  ctx.clearRect(0, 0, w, h);
  if (kept.length) { const disc = ctx.createRadialGradient(cx, cy - R0 * 0.3, R0 * 0.1, cx, cy, R0 * 0.92); disc.addColorStop(0, rgba(P[main[0]], look.theme === 'dark' ? 0.24 : 0.18)); disc.addColorStop(1, rgba(P[main[0]], 0)); ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(cx, cy, R0 * 0.92, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = rgba(G.ink, 0.14); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R0 - 5, 0, Math.PI * 2); ctx.stroke();
  const lw = Math.max(1, ((R0 * (Math.PI * 2 - 0.168)) / g.n) * 0.95); ctx.lineCap = 'round';
  days.forEach((d, i) => { const a = g.angOf(i), ca = Math.cos(a), sa = Math.sin(a);
    if (!d.family) { dot(ctx, cx + ca * (R0 + 2), cy + sa * (R0 + 2), 0.9, rgba(G.ink, 0.22)); return; }
    const len = L * (0.28 + 0.72 * d.v); ctx.strokeStyle = rgba(P[d.family], 0.55 + 0.45 * d.v); ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(cx + ca * R0, cy + sa * R0); ctx.lineTo(cx + ca * (R0 + len), cy + sa * (R0 + len)); ctx.stroke(); });
  ctx.font = FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  monthLengths(yearOf(days)).forEach((len, mo) => { const a = g.angOf(g.st[mo] + len / 2), rr = R0 + L + 13; ctx.fillStyle = rgba(G.ink, 0.78); ctx.fillText('JFMAMJJASOND'[mo], cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); });
  if (today >= 0 && today < g.n) { const at = g.angOf(today), r1 = R0 + L + 3, r2 = r1 + 8, px = -Math.sin(at), py = Math.cos(at);
    ctx.fillStyle = G.ink; ctx.beginPath(); ctx.moveTo(cx + Math.cos(at) * r1, cy + Math.sin(at) * r1); ctx.lineTo(cx + Math.cos(at) * r2 + px * 4.5, cy + Math.sin(at) * r2 + py * 4.5); ctx.lineTo(cx + Math.cos(at) * r2 - px * 4.5, cy + Math.sin(at) * r2 - py * 4.5); ctx.closePath(); ctx.fill(); }
  if (pick >= 0 && pick < g.n) { const ap = g.angOf(pick), q = R0 + L + 4; ctx.strokeStyle = G.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx + Math.cos(ap) * (R0 - 8), cy + Math.sin(ap) * (R0 - 8)); ctx.lineTo(cx + Math.cos(ap) * q, cy + Math.sin(ap) * q); ctx.stroke(); dot(ctx, cx + Math.cos(ap) * q, cy + Math.sin(ap) * q, 4.5, G.ink); }
  ctx.fillStyle = G.ink; ctx.font = "700 24px 'Atkinson Hyperlegible', sans-serif"; ctx.fillText(String(yearOf(days)), cx, cy - 12);
  ctx.font = FONT; ctx.fillStyle = rgba(G.ink, 0.72); ctx.fillText(`${kept.length} ${kept.length === 1 ? 'day' : 'days'} kept`, cx, cy + 12);
  if (kept.length) { drawSmall(ctx, look, main[0], cx - 44, cy + 32, 8); ctx.textAlign = 'left'; ctx.fillText(`mostly ${FAMILY_NAME[main[0]].toLowerCase()}`, cx - 30, cy + 32); }
}
/* Pixels: a column per month, a row per day of the month. */
const pixelBox = (w: number, h: number) => { const top = 22, left = 30; return { top, left, cw: (w - left - 2) / 12, ch: (h - top - 2) / 31 }; };
export function pixelHit(x: number, y: number, w: number, h: number, year: number): number {
  const { top, left, cw, ch } = pixelBox(w, h), mo = Math.floor((x - left) / cw), d = Math.floor((y - top) / ch), lens = monthLengths(year);
  if (x < left || y < top || mo < 0 || mo > 11 || d < 0 || d >= lens[mo]) return -1;
  return starts(lens)[mo] + d;
}
function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
export function drawYearPixels(ctx: Ctx, look: Look, w: number, h: number, days: YearDay[], today: number, pick: number) {
  const G = look.ground, P = look.pal, { top, left, cw, ch } = pixelBox(w, h), pw = cw * 0.84, ph = Math.max(2, ch * 0.74), rr = Math.min(ph / 2, 3.5), lens = monthLengths(yearOf(days)), st = starts(lens);
  ctx.clearRect(0, 0, w, h); ctx.font = FONT; ctx.fillStyle = rgba(G.ink, 0.72); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let mo = 0; mo < 12; mo++) ctx.fillText('JFMAMJJASOND'[mo], left + mo * cw + cw / 2, 1);
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; [1, 10, 20, 31].forEach(d => ctx.fillText(String(d), left - 5, top + (d - 0.5) * ch));
  lens.forEach((len, mo) => { for (let d = 0; d < len; d++) {
    const i = st[mo] + d, day = days[i], x = left + mo * cw + (cw - pw) / 2, y = top + d * ch + (ch - ph) / 2;
    ctx.fillStyle = day?.family ? P[day.family] : rgba(G.ink, 0.08); roundRect(ctx, x, y, pw, ph, rr); ctx.fill();
    if (i === pick || i === today) { ctx.strokeStyle = G.ink; ctx.lineWidth = i === pick ? 2.5 : 1.5; const k = i === pick ? 3 : 2; roundRect(ctx, x - k, y - k, pw + 2 * k, ph + 2 * k, rr + k / 2); ctx.stroke(); }
  } });
}
