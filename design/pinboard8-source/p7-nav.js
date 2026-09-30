function renderProto(){
  const host = document.getElementById("proto-screen");
  const keepScroll = host.querySelector(".content.scroll"), top = keepScroll ? keepScroll.scrollTop : 0, same = host.dataset.screen === ST.screen;
  host.innerHTML = PSCREENS[ST.screen](); host.dataset.screen = ST.screen;
  purgeScenes(); mountScenes(host); bindProto();
  if (same){ const sc = host.querySelector(".content.scroll"); if (sc) sc.scrollTop = top; }
  const dlg = host.querySelector(".sheet[aria-modal] .btn.primary, .sheet[aria-modal] .btn"); if (dlg && ST._focusSheet){ dlg.focus({preventScroll:true}); ST._focusSheet = false; }
  start();
}
function go(to){
  const i = to.indexOf(":"), kind = i < 0 ? to : to.slice(0, i), arg = i < 0 ? "" : to.slice(i + 1);
  ST.toast = null; ST.gloss = null; ST.entSheet = null; ST.fresh = null;
  if (kind === "back"){ ST.screen = ST.hist.pop() || "today"; ST.dayOpen = null; ST.yearPick = null; renderProto(); return; }
  if (kind === "screen"){ ST.hist = []; ST.screen = arg; ST.dayOpen = null; ST.yearPick = null; renderProto(); return; }
  if (kind === "alm"){ ST.hist = []; ST.almTab = arg; ST.screen = "almanac"; renderProto(); return; }
  ST.hist.push(ST.screen);
  if (kind === "tag"){ ST.tag = arg; ST.screen = "tag"; }
  else if (kind === "person"){ ST.person = arg; ST.pfilter = "all"; ST.screen = "person"; }
  else if (kind === "day"){ ST.dayOpen = null; ST.yearPick = null; ST.screen = "day"; }
  else if (kind === "add"){ ST.when = "now"; ST.add.q = ""; ST.screen = "add"; }
  else if (kind === "addsheet"){ ST.screen = "addsheet"; }
  else if (kind === "form"){ ST.form = arg; ST.fm = {kind:"Film", r:5, who:"Overheard", fam:"bright", who2:[], how:"In person", photo:null, current:false}; ST.screen = "form"; }
  else if (kind === "shelf"){ ST.shelf = arg; ST.screen = "shelf"; }
  else if (kind === "settings"){ ST.screen = "settings"; }
  else if (kind === "feel"){ const x = feelingOf(arg); if (x) ST.add = Object.assign({}, ST.add, {fam:x.f, word:findWord(x.w) ? x.w : (SYN2[x.w] ? SYN2[x.w].ws.find(w => findWord(w)) || x.w : x.w), q:"", nu:""}); ST.screen = "add"; }
  else if (kind === "search"){ ST.screen = "search"; }
  renderProto();
}
function readPhotos(input, then){ [...(input.files || [])].slice(0, 8).forEach(f => ST.photos.push({url:URL.createObjectURL(f), name:f.name})); if (ST.potd == null && ST.photos.length) ST.potd = 0; if (then) then(); }
/* where the caret sits in a :feeling token, if it does */
function tokenAt(text, pos){ const re = /(?<=^|\s):([\p{L}][\p{L}'-]*)/gu; let m; while ((m = re.exec(text))){ if (pos >= m.index && pos <= m.index + m[0].length) return {start:m.index, end:m.index + m[0].length, word:m[1]}; } return null; }
function bindProto(){
  const ta = document.getElementById("p-line");
  if (ta){
    const hl = ta.parentElement.querySelector(".hl"), keepBtn = document.querySelector('#proto [data-act="save"]');
    const upd = () => { ST.draft = ta.value; hl.innerHTML = hlHTML(ta.value); hl.scrollTop = ta.scrollTop; updateSugg(ta); if (keepBtn) keepBtn.disabled = !ta.value.trim(); };
    ta.addEventListener("input", upd); ta.addEventListener("keyup", e => { if (e.key.startsWith("Arrow")) updateSugg(ta); });
    /* a chosen feeling behaves as one piece: tapping it opens its card, and one Backspace removes the whole word */
    ta.addEventListener("click", () => { const tk = tokenAt(ta.value, ta.selectionStart), x = tk && tk.end < ta.value.length + 1 && feelingOf(tk.word); if (x && ta.value.slice(tk.end, tk.end + 1) === " "){ ST.gloss = {w:x.w, src:"draft", start:tk.start, end:tk.end}; ST._focusSheet = true; renderProto(); return; } updateSugg(ta); });
    ta.addEventListener("keydown", e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)){ e.preventDefault(); saveLine(); return; }
      if (e.key !== "Backspace" || ta.selectionStart !== ta.selectionEnd) return; const pos = ta.selectionStart, tk = tokenAt(ta.value, pos - 1);
      if (tk && feelingOf(tk.word) && (pos === tk.end || pos === tk.end + 1) && ta.value.slice(tk.end, tk.end + 1) !== ""){ e.preventDefault(); const cut = ta.value.slice(tk.end, tk.end + 1) === " " && pos === tk.end + 1 ? tk.end + 1 : tk.end; ta.value = ta.value.slice(0, tk.start) + ta.value.slice(cut); ta.setSelectionRange(tk.start, tk.start); upd(); } });
    ta.addEventListener("scroll", () => { hl.scrollTop = ta.scrollTop; });
    ta.addEventListener("blur", () => setTimeout(() => { const b = document.getElementById("p-sugg"); if (b && document.activeElement !== ta) b.hidden = true; }, 150));
  }
  const si = document.getElementById("p-search");
  if (si) si.addEventListener("input", () => { ST.search = si.value; document.getElementById("p-results").innerHTML = searchResults(si.value); mountScenes(document.getElementById("p-results")); });
  const fs = document.getElementById("p-fsearch");
  if (fs) fs.addEventListener("input", () => { ST.add.q = fs.value; const res = document.getElementById("p-fres"); res.innerHTML = feelingResults(fs.value); mountScenes(res); start(); document.getElementById("p-fbody").hidden = !!fs.value.trim(); const bar = document.querySelector("#proto .pinbar"); if (bar) bar.outerHTML = pinbar(); });
  const ph = document.getElementById("p-photos"); if (ph) ph.addEventListener("change", () => readPhotos(ph, renderProto));
  const fph = document.getElementById("f-photos"); if (fph) fph.addEventListener("change", () => readPhotos(fph, () => { ST.hist = []; ST.screen = "today"; renderProto(); }));
  const kp = document.getElementById("f-keepphoto"); if (kp) kp.addEventListener("change", () => { const f = kp.files && kp.files[0]; if (f){ ST.fm.photo = {url:URL.createObjectURL(f)}; renderProto(); } });
  const gr = document.getElementById("p-grateful"); if (gr) gr.addEventListener("input", () => { ST.grateful = gr.value; });
}
/* Keeping the line. Feelings typed with ":" become ONE moment at the time of writing (the first word leads, the rest ride along),
   and a word already logged in the last hour is not logged twice. */
function saveLine(){
  const text = ST.draft.trim(); if (!text) return;
  const tags = [...new Set([...text.matchAll(/#([\p{L}\p{N}_-]+)/gu)].map(m => m[1].toLowerCase()))];
  tags.forEach(t => { if (!TAGS.includes(t)) TAGS.push(t); });
  const id = ST.nextId++, now = 23.4, recent = new Set(MOMENTS.filter(m => Math.abs(m.h - now) <= 1).map(m => m.w));
  const all = [...text.matchAll(/(?<=^|\s):([\p{L}][\p{L}'-]*)/gu)].map(m => feelingOf(m[1])).filter(Boolean).filter((x, i, a) => a.findIndex(y => y.w === x.w) === i);
  const fs = all.filter(x => !recent.has(x.w)), already = all.filter(x => recent.has(x.w)).map(x => x.w);
  let mi = null;
  if (fs.length){ const f2 = (fs.find(x => x.f !== fs[0].f) || {}).f; MOMENTS.push({h:now, t:"11:24", ap:"pm", f:fs[0].f, f2, w:fs[0].w, n:fs.length > 1 ? "then " + fs.slice(1).map(x => x.w).join(", ") : "", s:3, src:id}); mi = MOMENTS.length - 1; }
  ST.kept.unshift({id, time:"11:24 pm", text, tags, marks:Object.assign({}, ST.marks)});
  ST.draft = ""; ST.marks = {}; ST.fresh = id; ST.toast = {msg:(fs.length ? `Kept, and ${fs.map(x => x.w).join(", ")} added to your inner weather.` : "Kept in today.") + (already.length ? ` ${already.join(", ")} was already there from the last hour.` : ""), undo:{kind:"entry", id}};
  renderProto();
}
function undo(){
  const u = ST.toast && ST.toast.undo; ST.toast = null; if (!u) return renderProto();
  if (u.kind === "entry"){ const e = ST.kept.find(k => k.id === u.id); ST.kept = ST.kept.filter(k => k.id !== u.id); MOMENTS = MOMENTS.filter(m => m.src !== u.id); if (e && e.text && !ST.draft) ST.draft = e.text; if (e && e.marks) ST.marks = Object.assign({}, e.marks); }
  else if (u.kind === "moment"){ MOMENTS = MOMENTS.filter(m => m !== u.m); }
  else if (u.kind === "overall"){ ST.overall = u.prev; }
  else if (u.kind === "restore"){ if (u.entryCopy) ST.kept[u.entryAt] = u.entryCopy; if (u.reinsert) ST.kept.splice(u.entryAt, 0, u.reinsert); if (u.moments) MOMENTS = u.moments; if (u.draft != null) ST.draft = u.draft; }
  renderProto();
}
/* Remove a feeling from wherever its card was opened: the line being written, a kept entry, or today's moments. */
function glossRemove(){
  const g = ST.gloss; if (!g) return; const beforeM = MOMENTS.slice();
  if (g.src === "draft"){ const d = ST.draft, tk = tokenAt(d, g.start + 1); if (tk){ const cut = d.slice(tk.end, tk.end + 1) === " " ? tk.end + 1 : tk.end; ST.toast = {msg:`Removed ${g.w} from your line.`, undo:{kind:"restore", draft:d}}; ST.draft = d.slice(0, tk.start) + d.slice(cut); } }
  else if (g.src && g.src.startsWith("kept:")){ const id = +g.src.slice(5), e = ST.kept.find(k => k.id === id); if (e){ const at = ST.kept.indexOf(e), copy = Object.assign({}, e), re = new RegExp(`(^|\\s):${g.w.replace(/ /g, "-").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}'-])`, "iu");
      e.text = e.text.replace(re, "$1").replace(/\s+([,.;!?])/g, "$1").replace(/\s{2,}/g, " ").trim(); MOMENTS = MOMENTS.filter(m => !(m.src === id && m.w === g.w)).map(m => m.src === id && m.n && m.n.includes(g.w) ? Object.assign({}, m, {n:m.n.replace(new RegExp(`,?\\s*${g.w}`), "").replace(/^then\s*$/, "")}) : m);
      ST.toast = {msg:`Removed ${g.w} from this entry.`, undo:{kind:"restore", moments:beforeM, entryAt:at, entryCopy:copy}}; } }
  else if (g.src && g.src.startsWith("m:")){ const m = MOMENTS[+g.src.slice(2)]; if (m){ MOMENTS = MOMENTS.filter(x => x !== m); ST.toast = {msg:`Removed ${m.w} from today.`, undo:{kind:"restore", moments:beforeM}}; } }
  ST.gloss = null; renderProto();
}
function yearTap(cv, ev){
  const r = cv.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top; let i = -1;
  if (cv.dataset.scene === "yradial") i = yearHit(x, y, r.width, r.height);
  else { const top = 22, left = 30, cw = (r.width - left - 2) / 12, ch = (r.height - top - 2) / 31, mo = Math.floor((x - left) / cw), d = Math.floor((y - top) / ch); if (mo >= 0 && mo < 12 && d >= 0 && d < LENS[mo]) i = LENS.slice(0, mo).reduce((a, b) => a + b, 0) + d; }
  ST.yearPick = i >= 0 ? i : null; renderProto();
}
function yearKey(ev){
  const n = yearDays().length, step = {ArrowRight:1, ArrowDown:ev.target.dataset.scene === "ypixels" ? 1 : 7, ArrowLeft:-1, ArrowUp:ev.target.dataset.scene === "ypixels" ? -1 : -7}[ev.key];
  if (ev.key === "Escape"){ ST.yearPick = null; renderProto(); return; }
  if (!step) return; ev.preventDefault();
  ST.yearPick = Math.max(0, Math.min(n - 1, (ST.yearPick == null ? TODAY_I : ST.yearPick) + step)); renderProto();
  const c = document.querySelector("#proto .ycanvas"); if (c) c.focus({preventScroll:true});
}
