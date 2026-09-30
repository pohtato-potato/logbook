/* ---------- canvas scene system ---------- */
const scenes = [];
let T = 0, last = 0, running = false, io = null;
const GRAIN = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 96;
  const g = c.getContext && c.getContext("2d"); if (!g) return null;
  const d = g.createImageData(96, 96), r = prng(5);
  for (let i = 0; i < d.data.length; i += 4){ const v = r() * 255 | 0; d.data[i] = d.data[i+1] = d.data[i+2] = v; d.data[i+3] = 24; }
  g.putImageData(d, 0, 0); return c;
})();
function grainOver(ctx, w, h, sc, a){ if (!GRAIN) return; if (!sc.pat) sc.pat = ctx.createPattern(GRAIN, "repeat"); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = sc.pat; ctx.fillRect(0, 0, w, h); ctx.restore(); }
const ang = hh => (hh - 12) / 24 * Math.PI * 2 - Math.PI / 2; /* noon at the top, like the sun */

/* ---------- feeling forms v3: abstract, built from points, rings and particles ---------- */
function glow(ctx, x, y, R, c, a){ const g = ctx.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, rgba(c, a)); g.addColorStop(1, rgba(c, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill(); }
function dot(ctx, x, y, s, fill){ ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, Math.max(.6, s), 0, Math.PI * 2); ctx.fill(); }
function twinkle(ctx, x, y, s, col){ ctx.strokeStyle = col; ctx.lineWidth = Math.max(.8, s * .22); ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke(); dot(ctx, x, y, s * .28, col); }
