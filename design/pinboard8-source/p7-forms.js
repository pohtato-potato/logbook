function formCols(fam){ const P = pal(), G = ground(), c = P[fam] || P.fog; return {c, G, lite:G.dark ? mix(c, "#FFFFFF", .45) : mix(c, "#000000", .14), ga:G.dark ? .32 : .26}; }
function drop(ctx, x, y, s, fill){ ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(x, y - s * 2.1); ctx.quadraticCurveTo(x + s * 1.25, y + s * .1, x, y + s); ctx.quadraticCurveTo(x - s * 1.25, y + s * .1, x, y - s * 2.1); ctx.fill(); }

const LINES = {
  /* rays that swell and settle, like a chord */
  bright(ctx, x, y, r, t){ const {c, lite, ga} = formCols("bright"); glow(ctx, x, y, r * .9, c, ga);
    ctx.lineWidth = Math.max(.9, r * .035);
    for (let i = 0; i < 30; i++){ const a = i / 30 * Math.PI * 2 + t * .06, k = .5 + .5 * Math.sin(t * 1.3 + i * 1.7) * Math.sin(t * .7 + i * .45), r0 = r * .3, r1 = r * (.52 + .42 * k);
      ctx.strokeStyle = rgba(i % 2 ? lite : c, .5 + .45 * k); ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.stroke(); }
    dot(ctx, x, y, r * .19, c); dot(ctx, x, y, r * .1, lite); },
  /* a sun setting over water, its reflection breaking up */
  wistful(ctx, x, y, r, t){ const {c, lite, ga} = formCols("wistful"); glow(ctx, x, y - r * .1, r * .9, c, ga);
    const hy = y + r * .06; ctx.lineWidth = Math.max(.9, r * .036);
    for (let k = 0; k < 3; k++){ ctx.strokeStyle = rgba(k ? c : lite, .95 - k * .25); ctx.beginPath(); ctx.arc(x, hy, r * (.24 + k * .14), Math.PI, Math.PI * 2); ctx.stroke(); }
    ctx.strokeStyle = rgba(lite, .75); ctx.beginPath(); ctx.moveTo(x - r * .86, hy); ctx.lineTo(x + r * .86, hy); ctx.stroke();
    for (let k = 0; k < 5; k++){ const yy = hy + r * (.13 + k * .12), wv = Math.sin(t * 1.2 + k * 1.3) * r * .07, half = r * (.56 - k * .09);
      ctx.strokeStyle = rgba(k % 2 ? c : lite, .8 - k * .12); ctx.setLineDash([r * .13, r * .07]); ctx.lineDashOffset = t * r * .12 * (k % 2 ? 1 : -1);
      ctx.beginPath(); ctx.moveTo(x - half + wv, yy); ctx.lineTo(x + half + wv, yy); ctx.stroke(); }
    ctx.setLineDash([]); },
  /* lines sagging under weight, breathing slowly */
  low(ctx, x, y, r, t){ const {c, lite, ga} = formCols("low"); glow(ctx, x, y + r * .2, r * .9, c, ga);
    ctx.lineWidth = Math.max(.9, r * .04);
    for (let k = 0; k < 6; k++){ const yy = y - r * .5 + k * r * .15, sag = r * (.1 + k * .045) * (1 + .18 * Math.sin(t * .6 + k * .5)), half = r * .74;
      ctx.strokeStyle = rgba(mix(lite, c, k / 5), .92); ctx.beginPath(); ctx.moveTo(x - half, yy); ctx.quadraticCurveTo(x, yy + sag * 2, x + half, yy); ctx.stroke(); } },
  /* flames drawn in fine line, hotter at the root */
  heated(ctx, x, y, r, t){ const {c, G} = formCols("heated"), hot = mix(c, "#FFE7B0", .55); glow(ctx, x, y + r * .15, r * .9, c, G.dark ? .32 : .26);
    ctx.lineWidth = Math.max(.9, r * .04);
    for (let k = 0; k < 7; k++){ const u = k / 6 - .5, x0 = x + u * r * .9, base = y + r * .62, top = y - r * (.3 + .45 * (1 - Math.abs(u) * 1.6)) - Math.sin(t * 3 + k) * r * .06;
      const g = ctx.createLinearGradient(0, base, 0, top); g.addColorStop(0, rgba(hot, .95)); g.addColorStop(1, rgba(c, .15)); ctx.strokeStyle = g; ctx.beginPath();
      for (let i = 0; i <= 22; i++){ const p = i / 22, yy = base - p * (base - top), xx = x0 * (1 - p * .55) + x * p * .55 + Math.sin(p * 5 + t * 4 + k * 1.3) * r * .07 * p; if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }
      ctx.stroke(); } },
  /* Warm (round 7: swapped one for one with Tense, drawing unchanged): rings that won't hold still */
  warm(ctx, x, y, r, t){ const {c, lite, ga} = formCols("warm"); glow(ctx, x, y, r * .9, c, ga);
    ctx.lineWidth = Math.max(.8, r * .03);
    for (let k = 0; k < 5; k++){ const base = r * (.18 + k * .16), f = 9 + k * 2; ctx.strokeStyle = rgba(k % 2 ? c : lite, .92 - k * .08); ctx.beginPath();
      for (let i = 0; i <= 90; i++){ const a = i / 90 * Math.PI * 2, rr = base * (1 + .07 * Math.sin(a * f + t * 7 + k) + .03 * Math.sin(a * (f * 2 + 1) - t * 13)), px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
      ctx.closePath(); ctx.stroke(); } }
};
Object.assign(LINES, {
  /* nested peaks, light climbing through them, a small star at the top */
  proud(ctx, x, y, r, t){ const {c, lite, ga} = formCols("proud"); glow(ctx, x, y, r * .9, c, ga);
    ctx.lineWidth = Math.max(.9, r * .035); ctx.lineJoin = "round";
    for (let k = 0; k < 5; k++){ const s = r * (.22 + k * .17), cy = y + r * .32, a = .35 + .6 * Math.max(0, Math.sin(t * 1.2 - k * .9));
      ctx.strokeStyle = rgba(k % 2 ? c : lite, a); ctx.beginPath(); ctx.moveTo(x - s * .9, cy + s * .2); ctx.lineTo(x, cy - s * 1.05); ctx.lineTo(x + s * .9, cy + s * .2); ctx.stroke(); }
    twinkle(ctx, x, y - r * .78, r * .13 * (1 + .15 * Math.sin(t * 2)), rgba(lite, .95)); },
  /* an orrery: nested orbits, each with a small world moving at its own pace */
  curious(ctx, x, y, r, t){ const {c, lite, ga} = formCols("curious"); glow(ctx, x, y, r * .9, c, ga);
    ctx.lineWidth = Math.max(.8, r * .028); ctx.save(); ctx.translate(x, y); ctx.rotate(-.35);
    [.36, .62, .9].forEach((rr, k) => { ctx.strokeStyle = rgba(k % 2 ? c : lite, .75 - k * .1); ctx.beginPath(); ctx.ellipse(0, 0, r * rr, r * rr * .5, 0, 0, Math.PI * 2); ctx.stroke();
      const a = t * (1.1 - k * .3) + k * 2.3; dot(ctx, Math.cos(a) * r * rr, Math.sin(a) * r * rr * .5, r * (.05 + k * .015), lite); });
    ctx.restore(); glow(ctx, x, y, r * .2, lite, .8); dot(ctx, x, y, r * .09, lite); },
  /* long, slow, nearly flat waves: still water */
  calm(ctx, x, y, r, t){ const {c, lite, ga} = formCols("calm"); glow(ctx, x, y, r * .9, c, ga);
    ctx.lineWidth = Math.max(.9, r * .035);
    for (let k = 0; k < 5; k++){ const yy = y - r * .44 + k * r * .22, amp = r * .035 * (1 + k * .15);
      for (let i = 0; i < 24; i++){ const u0 = i / 24, u1 = (i + 1) / 24, fade = Math.sin(Math.PI * (u0 + u1) / 2);
        ctx.strokeStyle = rgba(k % 2 ? c : lite, .9 * fade); ctx.beginPath();
        [u0, u1].forEach((u, j) => { const px = x + (u - .5) * r * 1.7, py = yy + Math.sin(u * Math.PI * 2 + t * .45 + k * .8) * amp; if (j) ctx.lineTo(px, py); else ctx.moveTo(px, py); }); ctx.stroke(); } } }
});
Object.assign(LINES, {
  /* Tense (round 7: swapped one for one with Warm, drawing unchanged): two arms turning round each other */
  tense(ctx, x, y, r, t){ const {c, lite, ga} = formCols("tense"); glow(ctx, x, y, r * .95, c, ga);
    ctx.lineWidth = Math.max(.8, r * .03);
    for (let arm = 0; arm < 2; arm++) for (let k = 0; k < 3; k++){ ctx.strokeStyle = rgba(arm ? lite : c, .9 - k * .22); ctx.beginPath();
      for (let i = 0; i <= 40; i++){ const p = i / 40, a = arm * Math.PI + p * Math.PI * 1.6 + t * .35 + k * .12, rr = r * (.12 + p * .78) * (1 - k * .06), px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke(); }
    glow(ctx, x, y, r * .24, lite, .7); }
});

/* ---------- small forms: at calendar size (under about 40px) the full drawings blur together, so each family gets a simple, still silhouette.
   Calm is level lines, Low sags, Wistful is a sun on a horizon: three different shapes, so they stay apart even in greyscale. ---------- */
const SMALL = {
  bright(ctx, x, y, r, c){ ctx.lineWidth = Math.max(1.4, r * .13); for (let i = 0; i < 8; i++){ const a = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * .55, y + Math.sin(a) * r * .55); ctx.lineTo(x + Math.cos(a) * r * .95, y + Math.sin(a) * r * .95); ctx.stroke(); } dot(ctx, x, y, r * .3, c); },
  proud(ctx, x, y, r){ ctx.lineWidth = Math.max(1.4, r * .13); ctx.lineJoin = "round"; [.55, .95].forEach(s => { ctx.beginPath(); ctx.moveTo(x - r * s * .85, y + r * .55); ctx.lineTo(x, y + r * .55 - r * s * 1.2); ctx.lineTo(x + r * s * .85, y + r * .55); ctx.stroke(); }); },
  curious(ctx, x, y, r, c){ ctx.lineWidth = Math.max(1.2, r * .11); ctx.save(); ctx.translate(x, y); ctx.rotate(-.35); ctx.beginPath(); ctx.ellipse(0, 0, r * .92, r * .46, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); dot(ctx, x, y, r * .22, c); dot(ctx, x + r * .74, y - r * .5, r * .15, c); },
  calm(ctx, x, y, r){ ctx.lineWidth = Math.max(1.4, r * .13); [-.45, 0, .45].forEach(k => { ctx.beginPath(); ctx.moveTo(x - r * .85, y + k * r); ctx.lineTo(x + r * .85, y + k * r); ctx.stroke(); }); },
  warm(ctx, x, y, r){ ctx.lineWidth = Math.max(1.2, r * .11); [.35, .65, .95].forEach((s, k) => { ctx.beginPath(); for (let i = 0; i <= 40; i++){ const a = i / 40 * Math.PI * 2, rr = r * s * (1 + .08 * Math.sin(a * (7 + k * 2))), px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.closePath(); ctx.stroke(); }); },
  wistful(ctx, x, y, r){ ctx.lineWidth = Math.max(1.4, r * .13); const hy = y + r * .15; ctx.beginPath(); ctx.arc(x, hy, r * .5, Math.PI, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - r * .95, hy); ctx.lineTo(x + r * .95, hy); ctx.stroke(); [[.45, .5], [.75, .3]].forEach(([dy, half]) => { ctx.beginPath(); ctx.moveTo(x - r * half, hy + r * dy); ctx.lineTo(x + r * half, hy + r * dy); ctx.stroke(); }); },
  low(ctx, x, y, r){ ctx.lineWidth = Math.max(1.4, r * .13); [-.5, -.05, .4].forEach((k, i) => { ctx.beginPath(); ctx.moveTo(x - r * .85, y + k * r); ctx.quadraticCurveTo(x, y + k * r + r * (.35 + i * .12), x + r * .85, y + k * r); ctx.stroke(); }); },
  tense(ctx, x, y, r){ ctx.lineWidth = Math.max(1.3, r * .12); for (let arm = 0; arm < 2; arm++){ ctx.beginPath(); for (let i = 0; i <= 30; i++){ const p = i / 30, a = arm * Math.PI + p * Math.PI * 1.5, rr = r * (.1 + p * .85), px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke(); } },
  heated(ctx, x, y, r){ ctx.lineWidth = Math.max(1.3, r * .12); [-.5, 0, .5].forEach((u, k) => { const top = y - r * (k === 1 ? .95 : .55); ctx.beginPath(); ctx.moveTo(x + u * r, y + r * .75); ctx.bezierCurveTo(x + u * r - r * .3, y + r * .1, x + u * r + r * .3, y - r * .2, x + u * r * .6, top); ctx.stroke(); }); }
};
function drawSmall(ctx, fam, x, y, r){
  const P = pal(), G = ground(), c = P[fam] || P.fog; if (!SMALL[fam]) return;
  glow(ctx, x, y, r * 1.3, c, G.dark ? .22 : .18);
  ctx.save(); ctx.lineCap = "round"; ctx.strokeStyle = G.dark ? mix(c, "#FFFFFF", .15) : mix(c, "#101820", .25); SMALL[fam](ctx, x, y, r, ctx.strokeStyle); ctx.restore();
}
/* Lines is the one form set now (round 6: "Perfect"). Small sizes switch to the still silhouettes above. */
function drawForm(ctx, fam, x, y, r, t, fam2){
  if (r < 13) drawSmall(ctx, fam, x, y, r);
  else if (LINES[fam]){ ctx.save(); ctx.lineCap = "round"; LINES[fam](ctx, x, y, r, t); ctx.restore(); }
  if (fam2) drawForm(ctx, fam2, x + r * .72, y - r * .66, r * .44, t);
}
