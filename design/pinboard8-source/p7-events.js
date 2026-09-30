document.addEventListener("mousedown", ev => { if (ev.target.closest("[data-sugg]")) ev.preventDefault(); });
document.addEventListener("keydown", ev => {
  if (ev.target.matches && ev.target.matches("#proto .ycanvas")){ yearKey(ev); return; }
  if (ev.key === "Escape" && document.querySelector("#proto .sheet")){ ST.gloss = null; ST.entSheet = null; ST.dayOpen = null; ST.yearPick = null; renderProto(); }
});
function protoAct(a, el){
  if (a === "save") saveLine();
  else if (a === "keepfeeling") keepFeeling(false); else if (a === "keepanother") keepFeeling(true); else if (a === "keepform") keepForm();
  else if (a === "closesheet"){ ST.dayOpen = null; renderProto(); } else if (a === "closeyear"){ ST.yearPick = null; renderProto(); }
  else if (a === "song"){ ST.songKept = !ST.songKept; renderProto(); }
  else if (a === "stamps"){ ST.stampsOpen = !ST.stampsOpen; renderProto(); } else if (a === "random"){ ST.randomI++; renderProto(); }
  else if (a === "more"){ ST.more = !ST.more; renderProto(); }
  else if (a === "undo") undo();
  else if (a === "overallyes"){ const prev = Object.assign({}, ST.overall); ST.overall = Object.assign({}, ST.overall, {set:true}); ST.toast = {msg:`The day overall is ${FN[ST.overall.f].toLowerCase()}.`, undo:{kind:"overall", prev}}; renderProto(); }
  else if (a === "overallchange"){ go("add"); ST.when = "day"; ST.add = Object.assign({}, ST.add, {fam:ST.overall.f, word:findWord(ST.overall.w) ? ST.overall.w : firstWord(ST.overall.f), q:""}); renderProto(); }
  else if (a === "glossclose"){ ST.gloss = null; renderProto(); } else if (a === "glossremove") glossRemove();
  else if (a === "entclose"){ ST.entSheet = null; renderProto(); }
  else if (a === "entremove"){ const e = ST.kept.find(k => k.id === ST.entSheet), at = ST.kept.indexOf(e), beforeM = MOMENTS.slice(); ST.kept = ST.kept.filter(k => k !== e); MOMENTS = MOMENTS.filter(m => m.src !== e.id); ST.entSheet = null; ST.toast = {msg:"Removed.", undo:{kind:"restore", entryAt:at, reinsert:e, moments:beforeM}}; renderProto(); }
  else if (a === "entedit"){ const e = ST.kept.find(k => k.id === ST.entSheet); ST.kept = ST.kept.filter(k => k !== e); MOMENTS = MOMENTS.filter(m => m.src !== e.id); ST.draft = e.text; ST.marks = Object.assign({}, e.marks); ST.entSheet = null; renderProto(); const ta = document.getElementById("p-line"); if (ta){ ta.focus({preventScroll:true}); ta.setSelectionRange(ta.value.length, ta.value.length); } }
  else if (a === "pickphotos"){ const i = document.getElementById("p-photos"); if (i) i.click(); }
  else if (a === "pickformphotos"){ const i = document.getElementById("f-photos"); if (i) i.click(); }
  else if (a === "pickkeep"){ const i = document.getElementById("f-keepphoto"); if (i) i.click(); }
  else if (a === "pcolour"){ PCOL[ST.person] = ((PCOL[ST.person] || 0) + 1) % PTHREADS.length; renderProto(); }
}
document.addEventListener("click", ev => {
  const t = ev.target;
  const setb = t.closest("[data-set]");
  if (setb){ const k = setb.dataset.set, v = setb.dataset.val; if (k === "flav") flav = v; else if (k === "bg") bg = v; else if (k === "tsize") tsize = +v; else if (k === "grey") grey = v === "on"; else motion = v; applyView(); return; }
  if (t.closest("#viewbtn")){ const bar = document.getElementById("bar"), open = bar.classList.toggle("open"); t.closest("#viewbtn").setAttribute("aria-expanded", String(open)); return; }
  const sug = t.closest("[data-sugg]"); if (sug){ applySugg(sug.dataset.sugg); return; }
  const flow = t.closest("[data-flow]");
  if (flow){ FLOWS[flow.dataset.flow](); renderProto(); if (window.innerWidth < 900) document.getElementById("proto").scrollIntoView({behavior:"smooth", block:"start"}); return; }
  if (!t.closest("#proto")){
    const vb = t.closest(".v");
    if (vb){ const id = vb.dataset.id, cur = R[id] || {v:"", n:""}; R[id] = {v: cur.v === vb.dataset.v ? "" : vb.dataset.v, n: cur.n || ""}; applyCard(id); updateCount(); persistItem(id); return; }
    const nb = t.closest(".notebtn");
    if (nb){ const box = document.getElementById("n-" + nb.dataset.note); box.hidden = !box.hidden; nb.setAttribute("aria-expanded", String(!box.hidden)); if (!box.hidden) document.getElementById("t-" + nb.dataset.note).focus(); return; }
    if (t.closest("#copy")) copyReactions();
    return;
  }
  const gl = t.closest("[data-gloss]"); if (gl){ ST.gloss = {w:gl.dataset.gloss, src:gl.dataset.src || (ST.gloss && ST.gloss.src) || null}; ST._focusSheet = true; renderProto(); return; }
  const g = t.closest("[data-go]"); if (g){ go(g.dataset.go); return; }
  const yc = t.closest('canvas[data-scene="yradial"], canvas[data-scene="ypixels"]'); if (yc && yc.classList.contains("ycanvas")){ yearTap(yc, ev); return; }
  const mk = t.closest("[data-mark]"); if (mk){ const k = mk.dataset.mark; ST.marks[k] = !ST.marks[k]; styleMark(mk, ST.marks[k]); return; }
  const act = t.closest("[data-act]"); if (act){ if (!act.disabled) protoAct(act.dataset.act, act); return; }
  const es = t.closest("[data-entsheet]"); if (es){ ST.entSheet = +es.dataset.entsheet; ST._focusSheet = true; renderProto(); return; }
  const wh = t.closest("[data-when]"); if (wh){ ST.when = wh.dataset.when; renderProto(); return; }
  const yst = t.closest("[data-yearstep]"); if (yst){ ST.yearPick = Math.max(0, Math.min(yearDays().length - 1, (ST.yearPick || 0) + +yst.dataset.yearstep)); renderProto(); return; }
  const pd = t.closest("[data-potd]"); if (pd){ ST.potd = +pd.dataset.potd; renderProto(); return; }
  const sp = t.closest("[data-suggph]"); if (sp){ const i = +sp.dataset.suggph; ST.photos.push({g:PHOTO_SUGG[i], sugg:i}); if (ST.potd == null) ST.potd = ST.photos.length - 1; if (ST.screen === "form"){ ST.hist = []; ST.screen = "today"; } renderProto(); return; }
  const ds = t.closest("[data-daystyle]"); if (ds){ ST.dayStyle = ds.dataset.daystyle; renderProto(); return; }
  const cu = t.closest("[data-custom]"); if (cu){ const w = cu.dataset.cword.toLowerCase(); ST.custom[w] = cu.dataset.custom; ST.add = Object.assign({}, ST.add, {fam:cu.dataset.custom, word:w, q:"", nu:""}); renderProto(); return; }
  const af = t.closest("[data-addfam]"); if (af){ ST.add.fam = af.dataset.addfam; ST.add.word = firstWord(ST.add.fam); ST.add.nu = ""; ST.add.f2 = null; ST.add.blend = null; renderProto(); return; }
  const aw = t.closest("[data-addword]"); if (aw){ const x = findWord(aw.dataset.addword); if (x){ if (x.f !== ST.add.fam){ ST.add.f2 = null; ST.add.blend = null; } ST.add.fam = x.f; ST.add.word = x.w; ST.add.nu = ""; ST.add.q = ""; } renderProto(); return; }
  const ab = t.closest("[data-addblend]"); if (ab){ const b = ATLAS.BLENDS.find(x => x.n === ab.dataset.addblend); if (b){ const on = ST.add.blend === b.n; ST.add.blend = on ? null : b.n; ST.add.f2 = on ? null : (b.a === ST.add.fam ? b.b : b.a); } renderProto(); return; }
  const an = t.closest("[data-addnu]"); if (an){ ST.add.nu = ST.add.nu === an.dataset.addnu ? "" : an.dataset.addnu; renderProto(); return; }
  const as = t.closest("[data-adds]"); if (as){ ST.add.s = +as.dataset.adds; renderProto(); return; }
  const fk = t.closest("[data-fmkind]"); if (fk){ ST.fm.kind = fk.dataset.fmkind; renderProto(); return; }
  const fr = t.closest("[data-fmr]"); if (fr){ ST.fm.r = +fr.dataset.fmr; renderProto(); return; }
  const fw = t.closest("[data-fmwho]"); if (fw){ ST.fm.who = fw.dataset.fmwho; renderProto(); return; }
  const fpl = t.closest("[data-fmplace]"); if (fpl){ ST.fm.place = fpl.dataset.fmplace; renderProto(); const i = document.getElementById("f-place"); if (i) i.value = ST.fm.place === "stall" ? "The chai stall" : "A new café by the metro"; return; }
  const ff = t.closest("[data-fmfam]"); if (ff){ ST.fm.fam = ff.dataset.fmfam; renderProto(); return; }
  const fp = t.closest("[data-fmp]"); if (fp){ const w = fp.dataset.fmp; ST.fm.who2 = ST.fm.who2.includes(w) ? ST.fm.who2.filter(x => x !== w) : [...ST.fm.who2, w]; renderProto(); return; }
  const fh = t.closest("[data-fmhow]"); if (fh){ ST.fm.how = fh.dataset.fmhow; renderProto(); return; }
  const vo = t.closest("[data-voice]"); if (vo){ ST.voice = +vo.dataset.voice; renderProto(); return; }
  const at = t.closest("[data-almtab]"); if (at){ ST.almTab = at.dataset.almtab; renderProto(); return; }
  const em = t.closest("[data-emo]"); if (em){ const i = em.dataset.emo.indexOf(":"), kind = em.dataset.emo.slice(0, i), key = em.dataset.emo.slice(i + 1); ST.emo = ST.emo && ST.emo.kind === kind && ST.emo.key === key ? null : {kind, key}; renderProto(); return; }
  const ct = t.closest("[data-caltab]"); if (ct){ ST.calTab = ct.dataset.caltab; ST.dayOpen = null; ST.yearPick = null; renderProto(); return; }
  const dd = t.closest("[data-day]"); if (dd){ ST.dayOpen = +dd.dataset.day; renderProto(); return; }
  const ys = t.closest("[data-ystyle]"); if (ys){ ST.ystyle = ys.dataset.ystyle; ST.yearPick = null; renderProto(); return; }
  const pf = t.closest("[data-pfilter]"); if (pf){ ST.pfilter = pf.dataset.pfilter; renderProto(); return; }
});
/* the laptop mock is drawn at desktop size and scaled to fit its card */
function fitLaptops(){ document.querySelectorAll(".laptop-frame").forEach(fr => { const inner = fr.querySelector(".laptop-inner"), s = Math.min(1, fr.clientWidth / 1240); inner.style.transform = `scale(${s})`; fr.style.height = Math.round(800 * s) + "px"; }); }
window.addEventListener("resize", () => setTimeout(fitLaptops, 160));
