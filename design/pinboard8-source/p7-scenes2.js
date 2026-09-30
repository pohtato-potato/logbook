
/* ---------- colour blending in OKLab, keeping the chroma so mixes don't go grey (the "grey dead zone") ---------- */
const srgb2lin = c => { c /= 255; return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
const lin2srgb = c => { const v = c <= .0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(0, c), 1 / 2.4) - .055; return Math.round(Math.max(0, Math.min(1, v)) * 255); };
function toOklab(hex){ const [r, g, b] = hexToRgb(hex).map(srgb2lin), l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s]; }
function fromOklab([L, A, B]){ const l = Math.pow(L + .3963377774 * A + .2158037573 * B, 3), m = Math.pow(L - .1055613458 * A - .0638541728 * B, 3), s = Math.pow(L - .0894841775 * A - 1.291485548 * B, 3);
  return "#" + [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.707614701 * s].map(v => lin2srgb(v).toString(16).padStart(2, "0")).join(""); }
/* weighted mix; the result keeps the average chroma of its parts, so pink and yellow meet in coral, not grey */
function mixOk(cols, ws, lightMul){
  let L = 0, A = 0, B = 0, C = 0, W = 0; cols.forEach((c, i) => { const [l, a, b] = toOklab(c), w = ws[i]; L += l * w; A += a * w; B += b * w; C += Math.hypot(a, b) * w; W += w; });
  L /= W; A /= W; B /= W; C /= W; const h = Math.atan2(B, A); return fromOklab([Math.min(.97, L * (lightMul || 1)), Math.cos(h) * C, Math.sin(h) * C]);
}
const easeIO = u => u * u * (3 - 2 * u);
/* how much daylight there is at an hour: a soft ramp around sunrise 6:08 and sunset 6:04, never a hard edge */
const daylight = hh => { const up = easeIO(Math.max(0, Math.min(1, (hh - 5.4) / 1.6))), down = 1 - easeIO(Math.max(0, Math.min(1, (hh - 17.4) / 1.8))); return Math.min(up, down); };
function dayColorOk(hh){ const P = pal(); const ws = MOMENTS.map(m => { let d = Math.abs(hh - m.h); d = Math.min(d, 24 - d); return Math.exp(-(d * d) / (2 * 2.2 * 2.2)) + 1e-3; }); return mixOk(MOMENTS.map(m => P[m.f]), ws); }

/* Bloom, round 7: the background glow is painted on its own layer and blurred as it lands, so the colours melt with no seams.
   Petals point at their hours (noon at the top). No labels: the moments are read in the story underneath. */
function bloomLayer(w, h, paint){
  const c = document.createElement("canvas"), dpr = Math.min(2, window.devicePixelRatio || 1); c.width = Math.max(1, Math.round(w * dpr)); c.height = Math.max(1, Math.round(h * dpr));
  const g = c.getContext && c.getContext("2d"); if (!g) return null; g.setTransform(dpr, 0, 0, dpr, 0, 0); paint(g); return c;
}
function bloomWash(g, w, h, cx, cy, R, t){
  const P = pal(), G = ground();
  g.globalCompositeOperation = G.dark ? "lighter" : "source-over";
  for (let i = 0; i < 96; i++){ const hh = i / 4, a = ang(hh + .125), col = dayColorOk(hh + .125), dl = .4 + .6 * daylight(hh), px = cx + Math.cos(a) * R * .55, py = cy + Math.sin(a) * R * .55, gr = g.createRadialGradient(px, py, 0, px, py, R * .75);
    gr.addColorStop(0, rgba(col, (G.dark ? .07 : .06) * dl)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
  MOMENTS.forEach((m, i) => { const a = ang(m.h), br = 1 + .04 * Math.sin(t * .7 + i); g.save(); g.translate(cx, cy); g.rotate(a); g.scale(1.3, .78);
    const gr = g.createRadialGradient(R * .5 * br, 0, 0, R * .5 * br, 0, R * .56); gr.addColorStop(0, rgba(P[m.f], G.dark ? .6 : .5)); gr.addColorStop(.6, rgba(P[m.f], G.dark ? .22 : .18)); gr.addColorStop(1, rgba(P[m.f], 0)); g.fillStyle = gr; g.beginPath(); g.arc(R * .5 * br, 0, R * .56, 0, Math.PI * 2); g.fill(); g.restore(); });
  g.globalCompositeOperation = "source-over";
}
/* Bloom with an outline: one continuous line runs round the bloom, swelling towards each moment's hour, and its colour follows the day as it goes round. */
function drawDayBloomLine(ctx, w, h, t, sc){
  const P = pal(), G = ground(); ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2 + 4, R = Math.min(w, h) * .36;
  const layer = bloomLayer(w, h, g => bloomWash(g, w, h, cx, cy, R * .92, t));
  if (layer){ ctx.save(); ctx.globalAlpha = .7; ctx.filter = `blur(${Math.round(R * .12)}px)`; ctx.drawImage(layer, 0, 0, w, h); ctx.filter = "none"; ctx.restore(); }
  const reach = a => { let v = .62; MOMENTS.forEach(m => { let d = Math.abs(a - ang(m.h)) % (Math.PI * 2); d = Math.min(d, Math.PI * 2 - d); v += .42 * Math.exp(-(d * d) / (2 * .32 * .32)) * (.7 + .1 * (m.s || 3)); }); return Math.min(1.1, v); };
  const N = 180, pts = []; for (let i = 0; i < N; i++){ const a = -Math.PI / 2 + i / N * Math.PI * 2, rr = R * reach(a) * (1 + .012 * Math.sin(t * .8 + i * .21)); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, a]); }
  ctx.lineCap = "round"; ctx.lineWidth = 3;
  for (let i = 0; i < N; i++){ const p = pts[i], q = pts[(i + 1) % N], hh = ((p[2] + Math.PI / 2) / (Math.PI * 2) * 24 + 12) % 24;
    ctx.strokeStyle = G.dark ? mix(dayColorOk(hh), "#FFFFFF", .15) : mix(dayColorOk(hh), "#101820", .2); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); }
  ctx.lineWidth = 1.2; ctx.globalAlpha = .45; ctx.beginPath(); pts.forEach((p, i) => { const x = cx + (p[0] - cx) * .8, y = cy + (p[1] - cy) * .8; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath(); ctx.strokeStyle = rgba(P[OVERALL], 1); ctx.stroke(); ctx.globalAlpha = 1;
  drawForm(ctx, OVERALL, cx, cy - 8, R * .24, t);
}
/* Score, revised: every mark sits on one line, placed only by time. Size shows how strongly it was felt. Nothing goes up or down. */
function drawScoreLine(ctx, w, h, t){
  const P = pal(); ctx.clearRect(0, 0, w, h);
  const left = 10, right = w - 10, cy = h * .5, X = hh => left + (hh - 6) / 18 * (right - left);
  ctx.strokeStyle = "rgba(241,243,245,.35)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(left, cy); ctx.lineTo(right, cy); ctx.stroke();
  ctx.fillStyle = "rgba(241,243,245,.65)"; ctx.font = "700 14px 'Atkinson Hyperlegible', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
  [6, 9, 12, 15, 18, 21, 24].forEach(hh => { ctx.fillRect(X(hh) - .5, cy + 30, 1, 5); ctx.fillText(hh === 12 ? "noon" : hh === 24 ? "12" : String(hh > 12 ? hh - 12 : hh), Math.min(right - 8, X(hh)), cy + 38); });
  MOMENTS.forEach(m => { const x = X(m.h), s = 6 + (m.s || 3) * 2.2; GLYPH[m.f](ctx, x, cy, s, P[m.f]); if (m.f2) GLYPH[m.f2](ctx, x + s + 5, cy, s * .5, P[m.f2]); ctx.fillStyle = "rgba(241,243,245,.9)"; ctx.textBaseline = "bottom"; ctx.textBaseline = "top"; });
  const ph = left + ((t * .025) % 1) * (right - left); ctx.strokeStyle = "rgba(241,243,245,.25)"; ctx.beginPath(); ctx.moveTo(ph, cy - 44); ctx.lineTo(ph, cy + 26); ctx.stroke();
}
/* An illustrated, approximate map: soft contours and a river, never real map tiles. Firsts glow. */
function drawPlaceMap(ctx, w, h, t, sc){
  const P = pal(), G = ground(), rnd = prng(77); ctx.fillStyle = G.dark ? "#121A22" : "#EEF1EC"; ctx.fillRect(0, 0, w, h);
  for (let k = 0; k < 9; k++){ const cx = w * (.2 + rnd() * .7), cy = h * (.2 + rnd() * .6), r0 = 18 + rnd() * 30; ctx.strokeStyle = rgba(G.ink, .07); ctx.lineWidth = 1; for (let j = 1; j <= 4; j++){ ctx.beginPath(); for (let i = 0; i <= 40; i++){ const a = i / 40 * Math.PI * 2, rr = r0 * j * (1 + .12 * Math.sin(a * 3 + k)); if (i) ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .7); else ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .7); } ctx.stroke(); } }
  ctx.strokeStyle = rgba(P.low, G.dark ? .45 : .5); ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-10, h * .8); ctx.bezierCurveTo(w * .3, h * .7, w * .45, h * .95, w * .7, h * .6); ctx.bezierCurveTo(w * .85, h * .42, w * .9, h * .5, w + 10, h * .35); ctx.stroke();
  ctx.strokeStyle = rgba(G.ink, .16); ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(w * .3, h * .66); ctx.bezierCurveTo(w * .5, h * .45, w * .65, h * .3, w * .8, h * .2); ctx.stroke(); ctx.setLineDash([]);
  ctx.font = "700 14px 'Atkinson Hyperlegible', sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  PLACES.forEach(p => { const x = p.x * w, y = p.y * h, c = P[p.fam]; if (p.first) glow(ctx, x, y, 22 + 3 * Math.sin(t * 2), c, .6); dot(ctx, x, y, p.home ? 6 : 4 + Math.min(4, p.visits / 6), c); ctx.strokeStyle = G.dark ? "#FFFFFF" : "#101820"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, p.home ? 6 : 4 + Math.min(4, p.visits / 6), 0, Math.PI * 2); ctx.stroke();
    if (p.first) twinkle(ctx, x + 9, y - 9, 4, G.ink); });
}
/* The year ring's geometry, shared with tapping: which day sits at an angle */
function yearGeom(w, h){ const m = Math.min(w, h), n = yearDays().length, gap = .014, mStart = []; let acc = 0; LENS.forEach(len => { mStart.push(acc); acc += len; }); const monthOf = i => { let mo = 0; while (mo < 11 && mStart[mo + 1] <= i) mo++; return mo; }, span = Math.PI * 2 - gap * 12;
  return {cx:w / 2, cy:h / 2, R0:m * .23, L:m * .17, angOf:i => -Math.PI / 2 + (i + .5) / n * span + gap * (monthOf(Math.floor(i)) + .5), n}; }
function yearHit(x, y, w, h){ const g = yearGeom(w, h), d = Math.hypot(x - g.cx, y - g.cy); if (d < g.R0 * .45 || d > g.R0 + g.L + 40) return -1; const a = Math.atan2(y - g.cy, x - g.cx); let best = -1, bd = 9;
  for (let i = 0; i < g.n; i++){ let da = Math.abs(((g.angOf(i) - a) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI); if (da < bd){ bd = da; best = i; } } return best; }
function dayOfYear(i){ let mo = 0, d = i; while (mo < 11 && d >= LENS[mo]){ d -= LENS[mo]; mo++; } return {mo, d:d + 1}; }
Object.assign(SCENES, {daybloomline:{anim:true, fn:drawDayBloomLine}, scoreline:{anim:true, fn:drawScoreLine}, placemap:{anim:true, fn:drawPlaceMap}});
