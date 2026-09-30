function yearDays(){ const out = []; YEAR.forEach(m => m.forEach(f => out.push(f))); return out; }
const TODAY_I = 271; /* 29 September is day 272 of 2026 */
const YEAR_NOTES = [{from:123, to:135, label:"Deadline season"}, {from:186, to:201, label:"Monsoon walks"}, {from:259, to:263, label:"The trip ✦"}];
function roundRect(ctx, x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
