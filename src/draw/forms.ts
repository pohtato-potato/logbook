/* The nine feeling forms (the Lines set approved in Pinboard 8) and their small silhouettes.
   Ported from design/pinboard8-source/p7-forms.js and p4-scenehead.js; drawings and motion unchanged. */
import type { Family } from '../vocab/vocab';
import { GROUND, mix, palette, type Theme } from '../domain/colour';

type Ctx = CanvasRenderingContext2D;
export interface Look { theme: Theme; pal: Record<Family | 'fog', string>; ground: (typeof GROUND)['dark'] | (typeof GROUND)['light'] }
export const lookOf = (theme: Theme): Look => ({ theme, pal: palette(theme), ground: GROUND[theme] });
export const rgba = (h: string, a: number) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
export function glow(ctx: Ctx, x: number, y: number, R: number, c: string, a: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, rgba(c, a)); g.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
}
export function dot(ctx: Ctx, x: number, y: number, s: number, fill: string) { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, Math.max(0.6, s), 0, Math.PI * 2); ctx.fill(); }
function twinkle(ctx: Ctx, x: number, y: number, s: number, col: string) { ctx.strokeStyle = col; ctx.lineWidth = Math.max(0.8, s * 0.22); ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke(); dot(ctx, x, y, s * 0.28, col); }
function formCols(look: Look, fam: Family) { const c = look.pal[fam], dark = look.theme === 'dark'; return { c, dark, lite: dark ? mix(c, '#FFFFFF', 0.45) : mix(c, '#000000', 0.14), ga: dark ? 0.32 : 0.26 }; }

type FormFn = (ctx: Ctx, look: Look, x: number, y: number, r: number, t: number) => void;
const LINES: Record<Family, FormFn> = {
  /* rays that swell and settle, like a chord */
  bright(ctx, look, x, y, r, t) { const { c, lite, ga } = formCols(look, 'bright'); glow(ctx, x, y, r * 0.9, c, ga);
    ctx.lineWidth = Math.max(0.9, r * 0.035);
    for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2 + t * 0.06, k = 0.5 + 0.5 * Math.sin(t * 1.3 + i * 1.7) * Math.sin(t * 0.7 + i * 0.45), r0 = r * 0.3, r1 = r * (0.52 + 0.42 * k);
      ctx.strokeStyle = rgba(i % 2 ? lite : c, 0.5 + 0.45 * k); ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.stroke(); }
    dot(ctx, x, y, r * 0.19, c); dot(ctx, x, y, r * 0.1, lite); },
  /* nested peaks, light climbing through them, a small star at the top */
  proud(ctx, look, x, y, r, t) { const { c, lite, ga } = formCols(look, 'proud'); glow(ctx, x, y, r * 0.9, c, ga);
    ctx.lineWidth = Math.max(0.9, r * 0.035); ctx.lineJoin = 'round';
    for (let k = 0; k < 5; k++) { const s = r * (0.22 + k * 0.17), cy = y + r * 0.32, a = 0.35 + 0.6 * Math.max(0, Math.sin(t * 1.2 - k * 0.9));
      ctx.strokeStyle = rgba(k % 2 ? c : lite, a); ctx.beginPath(); ctx.moveTo(x - s * 0.9, cy + s * 0.2); ctx.lineTo(x, cy - s * 1.05); ctx.lineTo(x + s * 0.9, cy + s * 0.2); ctx.stroke(); }
    twinkle(ctx, x, y - r * 0.78, r * 0.13 * (1 + 0.15 * Math.sin(t * 2)), rgba(lite, 0.95)); },
  /* an orrery: nested orbits, each with a small world moving at its own pace */
  curious(ctx, look, x, y, r, t) { const { c, lite, ga } = formCols(look, 'curious'); glow(ctx, x, y, r * 0.9, c, ga);
    ctx.lineWidth = Math.max(0.8, r * 0.028); ctx.save(); ctx.translate(x, y); ctx.rotate(-0.35);
    [0.36, 0.62, 0.9].forEach((rr, k) => { ctx.strokeStyle = rgba(k % 2 ? c : lite, 0.75 - k * 0.1); ctx.beginPath(); ctx.ellipse(0, 0, r * rr, r * rr * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
      const a = t * (1.1 - k * 0.3) + k * 2.3; dot(ctx, Math.cos(a) * r * rr, Math.sin(a) * r * rr * 0.5, r * (0.05 + k * 0.015), lite); });
    ctx.restore(); glow(ctx, x, y, r * 0.2, lite, 0.8); dot(ctx, x, y, r * 0.09, lite); },
  /* long, slow, nearly flat waves: still water */
  calm(ctx, look, x, y, r, t) { const { c, lite, ga } = formCols(look, 'calm'); glow(ctx, x, y, r * 0.9, c, ga);
    ctx.lineWidth = Math.max(0.9, r * 0.035);
    for (let k = 0; k < 5; k++) { const yy = y - r * 0.44 + k * r * 0.22, amp = r * 0.035 * (1 + k * 0.15);
      for (let i = 0; i < 24; i++) { const u0 = i / 24, u1 = (i + 1) / 24, fade = Math.sin(Math.PI * (u0 + u1) / 2);
        ctx.strokeStyle = rgba(k % 2 ? c : lite, 0.9 * fade); ctx.beginPath();
        [u0, u1].forEach((u, j) => { const px = x + (u - 0.5) * r * 1.7, py = yy + Math.sin(u * Math.PI * 2 + t * 0.45 + k * 0.8) * amp; if (j) ctx.lineTo(px, py); else ctx.moveTo(px, py); }); ctx.stroke(); } } },
  /* Warm (round 7: swapped one for one with Tense, drawing unchanged): rings that won't hold still */
  warm(ctx, look, x, y, r, t) { const { c, lite, ga } = formCols(look, 'warm'); glow(ctx, x, y, r * 0.9, c, ga);
    ctx.lineWidth = Math.max(0.8, r * 0.03);
    for (let k = 0; k < 5; k++) { const base = r * (0.18 + k * 0.16), f = 9 + k * 2; ctx.strokeStyle = rgba(k % 2 ? c : lite, 0.92 - k * 0.08); ctx.beginPath();
      for (let i = 0; i <= 90; i++) { const a = i / 90 * Math.PI * 2, rr = base * (1 + 0.07 * Math.sin(a * f + t * 7 + k) + 0.03 * Math.sin(a * (f * 2 + 1) - t * 13)), px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
      ctx.closePath(); ctx.stroke(); } },
  /* a sun setting over water, its reflection breaking up */
  wistful(ctx, look, x, y, r, t) { const { c, lite, ga } = formCols(look, 'wistful'); glow(ctx, x, y - r * 0.1, r * 0.9, c, ga);
    const hy = y + r * 0.06; ctx.lineWidth = Math.max(0.9, r * 0.036);
    for (let k = 0; k < 3; k++) { ctx.strokeStyle = rgba(k ? c : lite, 0.95 - k * 0.25); ctx.beginPath(); ctx.arc(x, hy, r * (0.24 + k * 0.14), Math.PI, Math.PI * 2); ctx.stroke(); }
    ctx.strokeStyle = rgba(lite, 0.75); ctx.beginPath(); ctx.moveTo(x - r * 0.86, hy); ctx.lineTo(x + r * 0.86, hy); ctx.stroke();
    for (let k = 0; k < 5; k++) { const yy = hy + r * (0.13 + k * 0.12), wv = Math.sin(t * 1.2 + k * 1.3) * r * 0.07, half = r * (0.56 - k * 0.09);
      ctx.strokeStyle = rgba(k % 2 ? c : lite, 0.8 - k * 0.12); ctx.setLineDash([r * 0.13, r * 0.07]); ctx.lineDashOffset = t * r * 0.12 * (k % 2 ? 1 : -1);
      ctx.beginPath(); ctx.moveTo(x - half + wv, yy); ctx.lineTo(x + half + wv, yy); ctx.stroke(); }
    ctx.setLineDash([]); },
  /* lines sagging under weight, breathing slowly */
  low(ctx, look, x, y, r, t) { const { c, lite, ga } = formCols(look, 'low'); glow(ctx, x, y + r * 0.2, r * 0.9, c, ga);
    ctx.lineWidth = Math.max(0.9, r * 0.04);
    for (let k = 0; k < 6; k++) { const yy = y - r * 0.5 + k * r * 0.15, sag = r * (0.1 + k * 0.045) * (1 + 0.18 * Math.sin(t * 0.6 + k * 0.5)), half = r * 0.74;
      ctx.strokeStyle = rgba(mix(lite, c, k / 5), 0.92); ctx.beginPath(); ctx.moveTo(x - half, yy); ctx.quadraticCurveTo(x, yy + sag * 2, x + half, yy); ctx.stroke(); } },
  /* Tense (round 7: swapped one for one with Warm, drawing unchanged): two arms turning round each other */
  tense(ctx, look, x, y, r, t) { const { c, lite, ga } = formCols(look, 'tense'); glow(ctx, x, y, r * 0.95, c, ga);
    ctx.lineWidth = Math.max(0.8, r * 0.03);
    for (let arm = 0; arm < 2; arm++) for (let k = 0; k < 3; k++) { ctx.strokeStyle = rgba(arm ? lite : c, 0.9 - k * 0.22); ctx.beginPath();
      for (let i = 0; i <= 40; i++) { const p = i / 40, a = arm * Math.PI + p * Math.PI * 1.6 + t * 0.35 + k * 0.12, rr = r * (0.12 + p * 0.78) * (1 - k * 0.06), px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke(); }
    glow(ctx, x, y, r * 0.24, lite, 0.7); },
  /* flames drawn in fine line, hotter at the root */
  heated(ctx, look, x, y, r, t) { const { c, dark } = formCols(look, 'heated'), hot = mix(c, '#FFE7B0', 0.55); glow(ctx, x, y + r * 0.15, r * 0.9, c, dark ? 0.32 : 0.26);
    ctx.lineWidth = Math.max(0.9, r * 0.04);
    for (let k = 0; k < 7; k++) { const u = k / 6 - 0.5, x0 = x + u * r * 0.9, base = y + r * 0.62, top = y - r * (0.3 + 0.45 * (1 - Math.abs(u) * 1.6)) - Math.sin(t * 3 + k) * r * 0.06;
      const g = ctx.createLinearGradient(0, base, 0, top); g.addColorStop(0, rgba(hot, 0.95)); g.addColorStop(1, rgba(c, 0.15)); ctx.strokeStyle = g; ctx.beginPath();
      for (let i = 0; i <= 22; i++) { const p = i / 22, yy = base - p * (base - top), xx = x0 * (1 - p * 0.55) + x * p * 0.55 + Math.sin(p * 5 + t * 4 + k * 1.3) * r * 0.07 * p; if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }
      ctx.stroke(); } },
};

/* Small forms: under about 40px the full drawings blur together, so each family gets a still silhouette.
   Calm is level lines, Low sags, Wistful is a sun on a horizon: different shapes, so they stay apart even in greyscale. */
type SmallFn = (ctx: Ctx, x: number, y: number, r: number, c: string) => void;
const SMALL: Record<Family, SmallFn> = {
  bright(ctx, x, y, r, c) { ctx.lineWidth = Math.max(1.4, r * 0.13); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55); ctx.lineTo(x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95); ctx.stroke(); } dot(ctx, x, y, r * 0.3, c); },
  proud(ctx, x, y, r) { ctx.lineWidth = Math.max(1.4, r * 0.13); ctx.lineJoin = 'round'; [0.55, 0.95].forEach(s => { ctx.beginPath(); ctx.moveTo(x - r * s * 0.85, y + r * 0.55); ctx.lineTo(x, y + r * 0.55 - r * s * 1.2); ctx.lineTo(x + r * s * 0.85, y + r * 0.55); ctx.stroke(); }); },
  curious(ctx, x, y, r, c) { ctx.lineWidth = Math.max(1.2, r * 0.11); ctx.save(); ctx.translate(x, y); ctx.rotate(-0.35); ctx.beginPath(); ctx.ellipse(0, 0, r * 0.92, r * 0.46, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); dot(ctx, x, y, r * 0.22, c); dot(ctx, x + r * 0.74, y - r * 0.5, r * 0.15, c); },
  calm(ctx, x, y, r) { ctx.lineWidth = Math.max(1.4, r * 0.13); [-0.45, 0, 0.45].forEach(k => { ctx.beginPath(); ctx.moveTo(x - r * 0.85, y + k * r); ctx.lineTo(x + r * 0.85, y + k * r); ctx.stroke(); }); },
  warm(ctx, x, y, r) { ctx.lineWidth = Math.max(1.2, r * 0.11); [0.35, 0.65, 0.95].forEach((s, k) => { ctx.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2, rr = r * s * (1 + 0.08 * Math.sin(a * (7 + k * 2))), px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.closePath(); ctx.stroke(); }); },
  wistful(ctx, x, y, r) { ctx.lineWidth = Math.max(1.4, r * 0.13); const hy = y + r * 0.15; ctx.beginPath(); ctx.arc(x, hy, r * 0.5, Math.PI, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - r * 0.95, hy); ctx.lineTo(x + r * 0.95, hy); ctx.stroke(); ([[0.45, 0.5], [0.75, 0.3]] as const).forEach(([dy, half]) => { ctx.beginPath(); ctx.moveTo(x - r * half, hy + r * dy); ctx.lineTo(x + r * half, hy + r * dy); ctx.stroke(); }); },
  low(ctx, x, y, r) { ctx.lineWidth = Math.max(1.4, r * 0.13); [-0.5, -0.05, 0.4].forEach((k, i) => { ctx.beginPath(); ctx.moveTo(x - r * 0.85, y + k * r); ctx.quadraticCurveTo(x, y + k * r + r * (0.35 + i * 0.12), x + r * 0.85, y + k * r); ctx.stroke(); }); },
  tense(ctx, x, y, r) { ctx.lineWidth = Math.max(1.3, r * 0.12); for (let arm = 0; arm < 2; arm++) { ctx.beginPath(); for (let i = 0; i <= 30; i++) { const p = i / 30, a = arm * Math.PI + p * Math.PI * 1.5, rr = r * (0.1 + p * 0.85), px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke(); } },
  heated(ctx, x, y, r) { ctx.lineWidth = Math.max(1.3, r * 0.12); [-0.5, 0, 0.5].forEach((u, k) => { const top = y - r * (k === 1 ? 0.95 : 0.55); ctx.beginPath(); ctx.moveTo(x + u * r, y + r * 0.75); ctx.bezierCurveTo(x + u * r - r * 0.3, y + r * 0.1, x + u * r + r * 0.3, y - r * 0.2, x + u * r * 0.6, top); ctx.stroke(); }); },
};
export function drawSmall(ctx: Ctx, look: Look, fam: Family, x: number, y: number, r: number) {
  const c = look.pal[fam] ?? look.pal.fog, dark = look.theme === 'dark';
  glow(ctx, x, y, r * 1.3, c, dark ? 0.22 : 0.18);
  const ink = dark ? mix(c, '#FFFFFF', 0.15) : mix(c, '#101820', 0.25);
  ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = ink; SMALL[fam](ctx, x, y, r, ink); ctx.restore();
}
/* Lines is the one form set. Small sizes switch to the still silhouettes above. */
export function drawForm(ctx: Ctx, look: Look, fam: Family, x: number, y: number, r: number, t: number, fam2?: Family) {
  if (r < 13) drawSmall(ctx, look, fam, x, y, r);
  else { ctx.save(); ctx.lineCap = 'round'; LINES[fam](ctx, look, x, y, r, t); ctx.restore(); }
  if (fam2) drawForm(ctx, look, fam2, x + r * 0.72, y - r * 0.66, r * 0.44, t);
}
