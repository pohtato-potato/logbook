import type { HourMix } from '../domain/looking';
import { rgba, type Look } from './forms';

/* Feelings through the day: a 24-hour ring (noon at the top); each hour's feelings stack outward, as long as that hour was full. */
const ang = (hh: number) => ((hh - 12) / 24) * Math.PI * 2 - Math.PI / 2;
export function drawClock(ctx: CanvasRenderingContext2D, look: Look, w: number, h: number, mix: HourMix) {
  const G = look.ground, cx = w / 2, cy = h / 2, r0 = Math.min(w, h) * 0.2, L = Math.min(w, h) * 0.17, most = Math.max(1, ...mix.map(x => x.count));
  ctx.clearRect(0, 0, w, h);
  for (const { hour, count, parts } of mix) {
    if (!count) continue;
    const a0 = ang(hour) + 0.03, a1 = ang(hour + 1) - 0.03; let r = r0;
    for (const [f, share] of parts) { const len = L * (count / most) * share; ctx.fillStyle = look.pal[f]; ctx.beginPath(); ctx.arc(cx, cy, r + len, a0, a1); ctx.arc(cx, cy, r, a1, a0, true); ctx.closePath(); ctx.fill(); r += len; }
  }
  ctx.strokeStyle = rgba(G.ink, 0.2); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, r0 - 4, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = rgba(G.ink, 0.75); ctx.font = "700 14px 'Atkinson Hyperlegible', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ([[12, 'noon'], [0, 'midnight']] as const).forEach(([hh, lab]) => { const a = ang(hh), rr = r0 - 14; ctx.fillText(lab, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); });
  ([[6, '6 am'], [18, '6 pm']] as const).forEach(([hh, lab]) => { const a = ang(hh), rr = r0 + L + 30; ctx.fillText(lab, Math.max(26, Math.min(w - 26, cx + Math.cos(a) * rr)), cy + Math.sin(a) * rr); });
}
