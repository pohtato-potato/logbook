/* The day page drawings: Bloom (outlined) and Score on one line.
   Ported from design/pinboard8-source/p7-scenes2.js and p7-scenes.js (GLYPH); drawings unchanged. */
import type { Family } from '../vocab/vocab';
import { mix, mixOk } from '../domain/colour';
import { dot, drawForm, rgba, type Look } from './forms';

type Ctx = CanvasRenderingContext2D;
export interface DayMoment { h: number; family: Family; second?: Family; strength: number }
const ang = (hh: number) => (hh - 12) / 24 * Math.PI * 2 - Math.PI / 2; // noon at the top, like the sun
const easeIO = (u: number) => u * u * (3 - 2 * u);
/* how much daylight there is at an hour: a soft ramp around sunrise and sunset, never a hard edge */
const daylight = (hh: number) => { const up = easeIO(Math.max(0, Math.min(1, (hh - 5.4) / 1.6))), down = 1 - easeIO(Math.max(0, Math.min(1, (hh - 17.4) / 1.8))); return Math.min(up, down); };
/* The day's colour at any hour: each moment's colour spreads into the hours around it, mixed in OKLab. */
function dayColorOk(look: Look, moments: DayMoment[], hh: number, fallback: Family): string {
  if (!moments.length) return look.pal[fallback];
  const ws = moments.map(m => { let d = Math.abs(hh - m.h) % 24; d = Math.min(d, 24 - d); return Math.exp(-(d * d) / (2 * 2.2 * 2.2)) + 1e-3; });
  return mixOk(moments.map(m => look.pal[m.family]), ws);
}
/* The background glow is painted on its own layer and blurred as it lands, so the colours melt with no seams. */
function bloomLayer(w: number, h: number, paint: (g: Ctx) => void): CanvasImageSource | null {
  const dpr = Math.min(2, (typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1), W = Math.max(1, Math.round(w * dpr)), H = Math.max(1, Math.round(h * dpr));
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, H) : typeof document !== 'undefined' ? Object.assign(document.createElement('canvas'), { width: W, height: H }) : null;
  const g = c && (c.getContext('2d') as Ctx | null); if (!c || !g) return null;
  g.setTransform(dpr, 0, 0, dpr, 0, 0); paint(g); return c as CanvasImageSource;
}
function bloomWash(look: Look, moments: DayMoment[], overall: Family, g: Ctx, w: number, h: number, cx: number, cy: number, R: number, t: number) {
  const dark = look.theme === 'dark';
  g.globalCompositeOperation = dark ? 'lighter' : 'source-over';
  for (let i = 0; i < 96; i++) { const hh = i / 4, a = ang(hh + 0.125), col = dayColorOk(look, moments, hh + 0.125, overall), dl = 0.4 + 0.6 * daylight(hh), px = cx + Math.cos(a) * R * 0.55, py = cy + Math.sin(a) * R * 0.55, gr = g.createRadialGradient(px, py, 0, px, py, R * 0.75);
    gr.addColorStop(0, rgba(col, (dark ? 0.07 : 0.06) * dl)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
  moments.forEach((m, i) => { const a = ang(m.h), br = 1 + 0.04 * Math.sin(t * 0.7 + i), c = look.pal[m.family]; g.save(); g.translate(cx, cy); g.rotate(a); g.scale(1.3, 0.78);
    const gr = g.createRadialGradient(R * 0.5 * br, 0, 0, R * 0.5 * br, 0, R * 0.56); gr.addColorStop(0, rgba(c, dark ? 0.6 : 0.5)); gr.addColorStop(0.6, rgba(c, dark ? 0.22 : 0.18)); gr.addColorStop(1, rgba(c, 0)); g.fillStyle = gr; g.beginPath(); g.arc(R * 0.5 * br, 0, R * 0.56, 0, Math.PI * 2); g.fill(); g.restore(); });
  g.globalCompositeOperation = 'source-over';
}
/* Bloom with an outline: one continuous line runs round the bloom, swelling towards each moment's hour; its colour follows the day. */
export function drawBloomLine(ctx: Ctx, look: Look, w: number, h: number, t: number, moments: DayMoment[], overall: Family) {
  const dark = look.theme === 'dark'; ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2 + 4, R = Math.min(w, h) * 0.36;
  const layer = bloomLayer(w, h, g => bloomWash(look, moments, overall, g, w, h, cx, cy, R * 0.92, t));
  if (layer) { ctx.save(); ctx.globalAlpha = 0.7; ctx.filter = `blur(${Math.round(R * 0.12)}px)`; ctx.drawImage(layer, 0, 0, w, h); ctx.filter = 'none'; ctx.restore(); }
  else { ctx.save(); ctx.globalAlpha = 0.7; bloomWash(look, moments, overall, ctx, w, h, cx, cy, R * 0.92, t); ctx.restore(); }
  const reach = (a: number) => { let v = 0.62; moments.forEach(m => { let d = Math.abs(a - ang(m.h)) % (Math.PI * 2); d = Math.min(d, Math.PI * 2 - d); v += 0.42 * Math.exp(-(d * d) / (2 * 0.32 * 0.32)) * (0.7 + 0.1 * (m.strength || 3)); }); return Math.min(1.1, v); };
  const N = 180, pts: [number, number, number][] = [];
  for (let i = 0; i < N; i++) { const a = -Math.PI / 2 + i / N * Math.PI * 2, rr = R * reach(a) * (1 + 0.012 * Math.sin(t * 0.8 + i * 0.21)); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, a]); }
  ctx.lineCap = 'round'; ctx.lineWidth = 3;
  for (let i = 0; i < N; i++) { const p = pts[i], q = pts[(i + 1) % N], hh = ((p[2] + Math.PI / 2) / (Math.PI * 2) * 24 + 12) % 24, col = dayColorOk(look, moments, hh, overall);
    ctx.strokeStyle = dark ? mix(col, '#FFFFFF', 0.15) : mix(col, '#101820', 0.2); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); }
  ctx.lineWidth = 1.2; ctx.globalAlpha = 0.45; ctx.beginPath(); pts.forEach((p, i) => { const x = cx + (p[0] - cx) * 0.8, y = cy + (p[1] - cy) * 0.8; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath(); ctx.strokeStyle = rgba(look.pal[overall], 1); ctx.stroke(); ctx.globalAlpha = 1;
  drawForm(ctx, look, overall, cx, cy - 8, R * 0.24, t);
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
type GlyphFn = (ctx: Ctx, x: number, y: number, s: number, c: string) => void;
/* The Score's own marks, one per family */
const GLYPH: Record<Family, GlyphFn> = {
  bright(ctx, x, y, s, c) { dot(ctx, x, y, s * 0.42, c); ctx.strokeStyle = c; ctx.lineWidth = 1.3; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * s * 0.62, y + Math.sin(a) * s * 0.62); ctx.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s); ctx.stroke(); } },
  proud(ctx, x, y, s, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.8, y + s * 0.6); ctx.lineTo(x - s * 0.8, y + s * 0.6); ctx.closePath(); ctx.fill(); },
  curious(ctx, x, y, s, c) { [[0, 0], [0.7, -0.5], [-0.6, -0.6], [0.2, 0.8], [-0.8, 0.4], [0.9, 0.5]].forEach(([dx, dy], i) => dot(ctx, x + dx * s, y + dy * s, i ? s * 0.16 : s * 0.26, c)); },
  calm(ctx, x, y, s, c) { ctx.strokeStyle = c; ctx.lineCap = 'round'; ctx.lineWidth = s * 0.5; ctx.beginPath(); ctx.moveTo(x - s * 1.8, y); ctx.lineTo(x + s * 1.8, y); ctx.stroke(); },
  warm(ctx, x, y, s, c) { ctx.strokeStyle = c; ctx.lineWidth = 1.6; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(x + k * s * 0.38, y, s * 0.62, 0, Math.PI * 2); ctx.stroke(); }); },
  wistful(ctx, x, y, s, c) { ctx.strokeStyle = c; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - s * 1.2, y - s * 0.8); ctx.bezierCurveTo(x - s * 0.2, y - s * 0.8, x + s * 0.1, y + s * 0.6, x + s * 1.2, y + s * 0.7); ctx.stroke(); dot(ctx, x + s * 1.2, y + s * 0.7, s * 0.22, c); },
  low(ctx, x, y, s, c) { ctx.fillStyle = c; roundRect(ctx, x - s * 1.2, y - s * 0.32, s * 2.4, s * 0.64, s * 0.3); ctx.fill(); },
  tense(ctx, x, y, s, c) { ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i <= 10; i++) { const px = x - s * 1.3 + i * s * 0.26, py = y + (i % 2 ? -s * 0.55 : s * 0.55); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke(); },
  heated(ctx, x, y, s, c) { ctx.fillStyle = c; for (let i = 0; i < 4; i++) { const px = x - s * 0.9 + i * s * 0.6; ctx.beginPath(); ctx.moveTo(px - s * 0.22, y + s * 0.6); ctx.lineTo(px, y - s * (0.6 + (i % 2) * 0.4)); ctx.lineTo(px + s * 0.22, y + s * 0.6); ctx.closePath(); ctx.fill(); } },
};
/* Score on one line: every mark sits on one line, placed only by time; size shows how strongly it was felt. Nothing goes up or down.
   The Score page is always drawn light-on-black, as approved. */
export function drawScoreLine(ctx: Ctx, look: Look, w: number, h: number, t: number, moments: DayMoment[]) {
  ctx.clearRect(0, 0, w, h);
  const left = 10, right = w - 10, cy = h * 0.5, X = (hh: number) => Math.min(right, left + (hh - 6) / 18 * (right - left));
  ctx.strokeStyle = 'rgba(241,243,245,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(left, cy); ctx.lineTo(right, cy); ctx.stroke();
  ctx.fillStyle = 'rgba(241,243,245,.72)'; ctx.font = "700 14px 'Atkinson Hyperlegible', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  [6, 9, 12, 15, 18, 21, 24].forEach(hh => { ctx.fillRect(X(hh) - 0.5, cy + 30, 1, 5); ctx.fillText(hh === 12 ? 'noon' : hh === 24 ? '12' : String(hh > 12 ? hh - 12 : hh), Math.min(right - 8, X(hh)), cy + 38); });
  moments.forEach(m => { const x = X(m.h), s = 6 + (m.strength || 3) * 2.2; GLYPH[m.family](ctx, x, cy, s, look.pal[m.family]); if (m.second) GLYPH[m.second](ctx, x + s + 5, cy, s * 0.5, look.pal[m.second]); });
  const ph = left + ((t * 0.025) % 1) * (right - left); ctx.strokeStyle = 'rgba(241,243,245,.25)'; ctx.beginPath(); ctx.moveTo(ph, cy - 44); ctx.lineTo(ph, cy + 26); ctx.stroke();
}
