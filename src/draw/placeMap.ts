import type { Place } from '../db/types';
import { MARK_FAMILY } from '../domain/colour';
import { projection } from '../domain/geo';
import { dot, glow, rgba, twinkle, type Look } from './forms';

const prng = (seed: number) => { let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
/* Logbook's own drawn map: soft contours, one river and a dashed path for texture (not real geography), then your places where they are.
   Dots are neutral ink and grow with visits; firsts glow and twinkle in the First mark's colour; homes are small house outlines. No names, no tiles, nothing fetched. */
export function drawPlaceMap(ctx: CanvasRenderingContext2D, look: Look, w: number, h: number, t: number, places: Place[], homes: { lat: number; lon: number }[]) {
  const G = look.ground, dark = look.theme === 'dark', rnd = prng(77), first = look.pal[MARK_FAMILY.first];
  ctx.fillStyle = dark ? '#121A22' : '#EEF1EC'; ctx.fillRect(0, 0, w, h);
  for (let k = 0; k < 9; k++) {
    const cx = w * (0.2 + rnd() * 0.7), cy = h * (0.2 + rnd() * 0.6), r0 = 18 + rnd() * 30; ctx.strokeStyle = rgba(G.ink, 0.07); ctx.lineWidth = 1;
    for (let j = 1; j <= 4; j++) { ctx.beginPath(); for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2, rr = r0 * j * (1 + 0.12 * Math.sin(a * 3 + k)), x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.7; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); }
  }
  ctx.strokeStyle = rgba(look.pal.low, dark ? 0.45 : 0.5); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-10, h * 0.8);
  ctx.bezierCurveTo(w * 0.3, h * 0.7, w * 0.45, h * 0.95, w * 0.7, h * 0.6); ctx.bezierCurveTo(w * 0.85, h * 0.42, w * 0.9, h * 0.5, w + 10, h * 0.35); ctx.stroke();
  ctx.strokeStyle = rgba(G.ink, 0.16); ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(w * 0.3, h * 0.66); ctx.bezierCurveTo(w * 0.5, h * 0.45, w * 0.65, h * 0.3, w * 0.8, h * 0.2); ctx.stroke(); ctx.setLineDash([]);
  const placed = places.filter((p): p is Place & { lat: number; lon: number } => p.lat != null && p.lon != null && Number.isFinite(p.lat) && Number.isFinite(p.lon));
  const P = projection([...placed, ...homes], w, h, Math.min(w, h) * 0.12); if (!P) return;
  ctx.strokeStyle = G.ink; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
  homes.forEach(hm => { const { x, y } = P(hm); ctx.beginPath(); ctx.moveTo(x - 7, y + 5); ctx.lineTo(x - 7, y - 2); ctx.lineTo(x, y - 8); ctx.lineTo(x + 7, y - 2); ctx.lineTo(x + 7, y + 5); ctx.closePath(); ctx.stroke(); });
  placed.forEach(p => {
    const { x, y } = P(p), r = 4 + Math.min(4, p.visits / 6);
    if (p.first) glow(ctx, x, y, 22 + 3 * Math.sin(t * 2), first, 0.6);
    dot(ctx, x, y, r, rgba(G.ink, 0.85)); ctx.strokeStyle = dark ? '#0F1317' : '#FFFFFF'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    if (p.first) twinkle(ctx, x + 9, y - 9, 4, first);
  });
}
