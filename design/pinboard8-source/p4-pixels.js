/* A year in pixels: a column per month, a row per day of the month. */
function drawYearPixels(ctx, w, h){
  const P = pal(), G = ground();
  ctx.clearRect(0, 0, w, h);
  const top = 22, left = 30, cw = (w - left - 2) / 12, ch = (h - top - 2) / 31, pw = cw * .84, ph = Math.max(2, ch * .74), rr = Math.min(ph / 2, 3.5);
  ctx.font = "700 14px 'Atkinson Hyperlegible', sans-serif"; ctx.fillStyle = rgba(G.ink, .72); ctx.textAlign = "center"; ctx.textBaseline = "top";
  for (let mo = 0; mo < 12; mo++) ctx.fillText("JFMAMJJASOND"[mo], left + mo * cw + cw / 2, 1);
  ctx.textAlign = "right"; ctx.textBaseline = "middle"; [1, 10, 20, 31].forEach(d => ctx.fillText(String(d), left - 5, top + (d - .5) * ch));
  YEAR.forEach((mdays, mo) => mdays.forEach((f, d) => {
    const x = left + mo * cw + (cw - pw) / 2, y = top + d * ch + (ch - ph) / 2;
    ctx.fillStyle = f ? P[f] : rgba(G.ink, .08); roundRect(ctx, x, y, pw, ph, rr); ctx.fill();
    const idx = LENS.slice(0, mo).reduce((a, b) => a + b, 0) + d;
    if (typeof ST !== "undefined" && ST.yearPick === idx){ ctx.strokeStyle = G.ink; ctx.lineWidth = 2.5; roundRect(ctx, x - 3, y - 3, pw + 6, ph + 6, rr + 2); ctx.stroke(); }
    if (mo === 8 && d === 28){ ctx.strokeStyle = G.ink; ctx.lineWidth = 1.5; roundRect(ctx, x - 2, y - 2, pw + 4, ph + 4, rr + 1.5); ctx.stroke(); }
  }));
}
