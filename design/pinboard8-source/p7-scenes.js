/* The year as a sunburst: one line per day in its feeling's colour, longer and brighter when more was logged. Small gaps between months; today is marked. */
function drawYearRadial(ctx, w, h, t, sc){
  const P = pal(), G = ground(), mini = sc.args.mini === "1", notes = sc.args.notes === "1";
  ctx.clearRect(0, 0, w, h);
  const days = yearDays(), n = days.length, m = Math.min(w, h), cx = w / 2, cy = h / 2, gap = .014;
  const R0 = m * (notes ? .21 : mini ? .27 : .23), L = m * (notes ? .14 : mini ? .19 : .17);
  const mStart = []; let acc = 0; LENS.forEach(len => { mStart.push(acc); acc += len; });
  const monthOf = i => { let mo = 0; while (mo < 11 && mStart[mo + 1] <= i) mo++; return mo; };
  const span = Math.PI * 2 - gap * 12, angOf = i => -Math.PI / 2 + (i + .5) / n * span + gap * (monthOf(Math.floor(i)) + .5);
  const disc = ctx.createRadialGradient(cx, cy - R0 * .3, R0 * .1, cx, cy, R0 * .92); disc.addColorStop(0, rgba(P[OVERALL], G.dark ? .24 : .18)); disc.addColorStop(1, rgba(P[OVERALL], 0));
  ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(cx, cy, R0 * .92, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rgba(G.ink, .14); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R0 - 5, 0, Math.PI * 2); ctx.stroke();
  const lw = Math.max(1, R0 * span / n * .95); ctx.lineCap = "round";
  days.forEach((f, i) => { const a = angOf(i), ca = Math.cos(a), sa = Math.sin(a);
    if (!f){ dot(ctx, cx + ca * (R0 + 2), cy + sa * (R0 + 2), .9, rgba(G.ink, .22)); return; }
    const v = INTENSITY[i], len = L * (.28 + .72 * v); ctx.strokeStyle = rgba(P[f], .55 + .45 * v); ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(cx + ca * R0, cy + sa * R0); ctx.lineTo(cx + ca * (R0 + len), cy + sa * (R0 + len)); ctx.stroke(); });
  if (!mini && !notes){ ctx.font = "700 14px 'Atkinson Hyperlegible', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    LENS.forEach((len, mo) => { const a = angOf(mStart[mo] + len / 2), rr = R0 + L + 13; ctx.fillStyle = rgba(G.ink, mo > 8 ? .38 : .78); ctx.fillText("JFMAMJJASOND"[mo], cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }); }
  const at = angOf(TODAY_I), r1 = R0 + L + (mini || notes ? 2 : 3), r2 = r1 + 8, px = -Math.sin(at), py = Math.cos(at);
  ctx.fillStyle = G.ink; ctx.beginPath(); ctx.moveTo(cx + Math.cos(at) * r1, cy + Math.sin(at) * r1); ctx.lineTo(cx + Math.cos(at) * r2 + px * 4.5, cy + Math.sin(at) * r2 + py * 4.5); ctx.lineTo(cx + Math.cos(at) * r2 - px * 4.5, cy + Math.sin(at) * r2 - py * 4.5); ctx.closePath(); ctx.fill();
  if (!mini && !notes && typeof ST !== "undefined" && ST.yearPick != null && ST.yearPick >= 0){ const ap = angOf(ST.yearPick), q = R0 + L + 4; ctx.strokeStyle = G.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx + Math.cos(ap) * (R0 - 8), cy + Math.sin(ap) * (R0 - 8)); ctx.lineTo(cx + Math.cos(ap) * q, cy + Math.sin(ap) * q); ctx.stroke(); dot(ctx, cx + Math.cos(ap) * q, cy + Math.sin(ap) * q, 4.5, G.ink); }
  if (notes){
    YEAR_NOTES.forEach((nt, k) => {
      const a = angOf((nt.from + nt.to) / 2), ca = Math.cos(a), sa = Math.sin(a), q1 = R0 + L + 6, q2 = q1 + 17;
      ctx.strokeStyle = rgba(G.ink, .6); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(cx, cy, q1, angOf(nt.from) - .01, angOf(nt.to) + .01); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + ca * q1, cy + sa * q1); ctx.lineTo(cx + ca * (q2 - 8), cy + sa * (q2 - 8)); ctx.stroke();
      dot(ctx, cx + ca * q2, cy + sa * q2, 11, G.ink);
      ctx.fillStyle = G.dark ? "#0F1317" : "#FFFFFF"; ctx.font = "700 14px 'Atkinson Hyperlegible', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(k + 1), cx + ca * q2, cy + sa * q2 + .5);
    });
  }
  if (!mini && !notes){ ctx.fillStyle = G.ink; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 24px 'Atkinson Hyperlegible', sans-serif"; ctx.fillText("2026", cx, cy - 12);
    ctx.font = "700 14px 'Atkinson Hyperlegible', sans-serif"; ctx.fillStyle = rgba(G.ink, .72); ctx.fillText("214 days kept", cx, cy + 12); drawSmall(ctx, OVERALL, cx - 44, cy + 32, 8); ctx.textAlign = "left"; ctx.fillText("mostly warm", cx - 30, cy + 32); }
}

/* Feelings through the day, for the Emotions tab: a 24-hour ring (noon at the top), each hour's feelings stacked outward. */
const HOURMIX = hh => hh >= 6 && hh < 10 ? [["tense",.35],["calm",.3],["bright",.2],["low",.15]] : hh >= 10 && hh < 15 ? [["bright",.3],["proud",.25],["curious",.25],["tense",.2]] : hh >= 15 && hh < 21 ? [["warm",.45],["calm",.2],["bright",.2],["wistful",.15]] : [["wistful",.4],["calm",.3],["low",.2],["warm",.1]];
function drawClock(ctx, w, h){
  const P = pal(), G = ground(); ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2, r0 = Math.min(w, h) * .2, L = Math.min(w, h) * .17;
  const amt = hh => { const pk = [9, 13, 19, 23]; let v = .08; pk.forEach(p => { let d = Math.abs(hh - p); d = Math.min(d, 24 - d); v += Math.exp(-(d * d) / 3.2); }); return Math.min(1, v); };
  for (let hh = 0; hh < 24; hh++){ const a0 = ang(hh) + .03, a1 = ang(hh + 1) - .03; let r = r0; HOURMIX(hh + .5).forEach(([f, s]) => { const len = L * amt(hh + .5) * s; ctx.fillStyle = P[f]; ctx.beginPath(); ctx.arc(cx, cy, r + len, a0, a1); ctx.arc(cx, cy, r, a1, a0, true); ctx.closePath(); ctx.fill(); r += len; }); }
  ctx.strokeStyle = rgba(G.ink, .2); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, r0 - 4, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = rgba(G.ink, .75); ctx.font = "700 14px 'Atkinson Hyperlegible', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  [[12, "noon"], [0, "midnight"]].forEach(([hh, lab]) => { const a = ang(hh), rr = r0 - 14; ctx.fillText(lab, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); });
  [[6, "6 am"], [18, "6 pm"]].forEach(([hh, lab]) => { const a = ang(hh), rr = r0 + L + 30; ctx.fillText(lab, Math.max(26, Math.min(w - 26, cx + Math.cos(a) * rr)), cy + Math.sin(a) * rr); });
}

/* ---------- Score: the day as a graphic score, after Endel and the avant-garde scores it draws on ---------- */
const GLYPH = {
  bright(ctx, x, y, s, c){ dot(ctx, x, y, s * .42, c); ctx.strokeStyle = c; ctx.lineWidth = 1.3; for (let i = 0; i < 8; i++){ const a = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * s * .62, y + Math.sin(a) * s * .62); ctx.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s); ctx.stroke(); } },
  proud(ctx, x, y, s, c){ ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * .8, y + s * .6); ctx.lineTo(x - s * .8, y + s * .6); ctx.closePath(); ctx.fill(); },
  curious(ctx, x, y, s, c){ [[0, 0], [.7, -.5], [-.6, -.6], [.2, .8], [-.8, .4], [.9, .5]].forEach(([dx, dy], i) => dot(ctx, x + dx * s, y + dy * s, i ? s * .16 : s * .26, c)); },
  calm(ctx, x, y, s, c){ ctx.strokeStyle = c; ctx.lineCap = "round"; ctx.lineWidth = s * .5; ctx.beginPath(); ctx.moveTo(x - s * 1.8, y); ctx.lineTo(x + s * 1.8, y); ctx.stroke(); },
  warm(ctx, x, y, s, c){ ctx.strokeStyle = c; ctx.lineWidth = 1.6; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(x + k * s * .38, y, s * .62, 0, Math.PI * 2); ctx.stroke(); }); },
  wistful(ctx, x, y, s, c){ ctx.strokeStyle = c; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - s * 1.2, y - s * .8); ctx.bezierCurveTo(x - s * .2, y - s * .8, x + s * .1, y + s * .6, x + s * 1.2, y + s * .7); ctx.stroke(); dot(ctx, x + s * 1.2, y + s * .7, s * .22, c); },
  low(ctx, x, y, s, c){ ctx.fillStyle = c; roundRect(ctx, x - s * 1.2, y - s * .32, s * 2.4, s * .64, s * .3); ctx.fill(); },
  tense(ctx, x, y, s, c){ ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i <= 10; i++){ const px = x - s * 1.3 + i * s * .26, py = y + (i % 2 ? -s * .55 : s * .55); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke(); },
  heated(ctx, x, y, s, c){ ctx.fillStyle = c; for (let i = 0; i < 4; i++){ const px = x - s * .9 + i * s * .6; ctx.beginPath(); ctx.moveTo(px - s * .22, y + s * .6); ctx.lineTo(px, y - s * (.6 + (i % 2) * .4)); ctx.lineTo(px + s * .22, y + s * .6); ctx.closePath(); ctx.fill(); } }
};
const clearWrap = fn => (ctx, w, h, t, sc) => { ctx.clearRect(0, 0, w, h); fn(ctx, w, h, t, sc); };
const SCENES = {
  form:{anim:true, fn:clearWrap((ctx, w, h, t, sc) => { let k = +sc.args.scale || 1; if (sc.args.bloom === "1"){ if (!sc.t0) sc.t0 = T; const u = Math.min(1, (T - sc.t0) / 2.4 + (speed() === 0 ? 1 : 0)); k *= .25 + .75 * (1 - Math.pow(1 - u, 3)); } drawForm(ctx, sc.args.f || OVERALL, w / 2, h / 2 + (sc.args.f === "proud" ? h * .04 : 0), Math.min(w, h) * .31 * k, t, sc.args.f2); })},
  bloomcell:{anim:false, fn:drawBloomCell}, bloomday:{anim:true, fn:drawBloomDay},
  monthwall:{anim:false, fn:drawMonthWall},
  yradial:{anim:false, fn:drawYearRadial}, ypixels:{anim:false, fn:drawYearPixels},
  clock:{anim:false, fn:drawClock},
  glyph:{anim:false, fn:clearWrap((ctx, w, h, t, sc) => drawSmall(ctx, sc.args.f || OVERALL, w / 2, h / 2, Math.min(w, h) * .4))}
};
