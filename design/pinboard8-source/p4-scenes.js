/* ---------- other scenes ---------- */
function bloomMoments(parts){ const slots = parts.length === 1 ? [13] : parts.length === 2 ? [10, 19] : parts.length === 3 ? [9, 14, 20] : [8.5, 13, 18.5, 23]; return parts.map((f, i) => ({h:slots[i] || 12, f})); }
function drawBloomGeneric(ctx, w, h, t, moments, overall, opt){
  const P = pal(), G = ground(), cx = w / 2, cy = h * (opt.cy || .52), R = Math.min(w, h) * (opt.R || .33);
  if (opt.fill){ ctx.fillStyle = G.dark ? mix(P[overall], G.base, .86) : mix(P[overall], "#FFFFFF", .86); ctx.fillRect(0, 0, w, h); }
  glow(ctx, cx, cy, R * 1.7, P[overall], G.dark ? .28 : .22);
  ctx.strokeStyle = rgba(G.ink, opt.fill ? .16 : .22); ctx.lineWidth = opt.small ? 1 : 1.2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  if (opt.labels){ ctx.fillStyle = rgba(G.ink, .72); ctx.font = "700 12px 'Atkinson Hyperlegible', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; [[6,"6 am"],[12,"noon"],[18,"6 pm"],[0,"midnight"]].forEach(([hh, lab]) => { const a = ang(hh); ctx.fillText(lab, cx + Math.cos(a) * (R + 26), cy + Math.sin(a) * (R + 14)); }); }
  moments.forEach(m => { const a = ang(m.h); drawForm(ctx, m.f, cx + Math.cos(a) * R, cy + Math.sin(a) * R, R * (opt.mr || (opt.small ? .22 : .2)), t, opt.small ? null : m.f2); });
  if (!opt.small) drawForm(ctx, overall, cx, cy, R * .34, t); else dot(ctx, cx, cy, R * .22, P[overall]);
}
function drawBloomCell(ctx, w, h, t, sc){ ctx.clearRect(0, 0, w, h); const parts = (sc.args.parts || "").split(",").filter(Boolean); if (!parts.length) return; drawBloomGeneric(ctx, w, h, t, bloomMoments(parts), parts[Math.floor(parts.length / 2)], {small:true, R:.3, cy:.56}); }
function drawBloomDay(ctx, w, h, t, sc){ ctx.clearRect(0, 0, w, h); const parts = (sc.args.parts || "").split(",").filter(Boolean); if (!parts.length) return; drawBloomGeneric(ctx, w, h, t, bloomMoments(parts), parts[Math.floor(parts.length / 2)], {labels:false, R:.36, mr:.27}); }
function drawMonthWall(ctx, w, h, t, sc){
  const P = pal(), G = ground(), rnd = prng(311), blur = "filter" in ctx;
  ctx.fillStyle = G.base; ctx.fillRect(0, 0, w, h);
  MONTH.forEach(day => {
    if (!day.parts.length) return;
    const i = day.d - 1, col = i % 5, row = Math.floor(i / 5);
    const x = (col + .5 + (rnd() - .5) * .9) / 5 * w, y = (row + .5 + (rnd() - .5) * .9) / 6 * h, r = Math.min(w, h) * (.16 + rnd() * .12);
    ctx.save(); if (blur) ctx.filter = `blur(${Math.round(r * .4)}px)`;
    ctx.globalAlpha = G.dark ? .55 : .5; ctx.fillStyle = P[day.overall]; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  });
  grainOver(ctx, w, h, sc, G.dark ? .4 : .3);
}
