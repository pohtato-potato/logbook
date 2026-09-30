/* ---------- prototype state ---------- */
const ST = {screen:"today", hist:[], calTab:"days", dayOpen:null, person:"A", pfilter:"all", tag:"chai", search:"", draft:"", marks:{}, kept:[], nextId:1,
  add:{fam:"wistful", word:"nostalgic", nu:"", s:3, q:"", f2:null, blend:null}, when:"now", overall:{f:"warm", w:"close", s:4, set:false},
  ystyle:"radial", emo:null, custom:{}, photos:[], potd:null, grateful:"", songKept:false, stampsOpen:false, voice:0, form:"media", fm:{}, shelf:"firsts",
  almTab:"report", randomI:0, yearPick:null, dayStyle:"bloomline", eve:true, more:false, toast:null, gloss:null, entSheet:null, fresh:null};
const ADDICON = {
  feeling:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/></svg>`,
  photo:IC.photo,
  media:`<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M8 4v16M16 4v16M4 9h4M4 15h4M16 9h4M16 15h4"/></svg>`,
  quote:`<svg viewBox="0 0 24 24"><path d="M9 7c-3 1-4.5 3.5-4.5 6.5V17H9v-4H6.8M19 7c-3 1-4.5 3.5-4.5 6.5V17H19v-4h-2.2"/></svg>`,
  place:`<svg viewBox="0 0 24 24"><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="10" r="2.3"/></svg>`,
  person:`<svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.8 3.6-6 7-6s6.2 2.2 7 6"/></svg>`,
  keep:`<svg viewBox="0 0 24 24"><path d="M4 7.5h16v3a2 2 0 0 0 0 3v3H4v-3a2 2 0 0 0 0-3z"/><path d="M14.5 7.5v9" stroke-dasharray="1.5 2"/></svg>`,
  voice:`<svg viewBox="0 0 24 24"><rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5"/></svg>`,
  span:`<svg viewBox="0 0 24 24"><path d="M4 12h16M4 8v8M20 8v8"/></svg>`,
  past:`<svg viewBox="0 0 24 24"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v3.2h3.2"/><path d="M12 8v4.3l2.8 1.7"/></svg>`
};
const PHOTO_SUGG = [["#9fb3c8","#4d5b73"],["#e0a9a0","#6d4b5e"],["#a7c8b8","#3f5e56"],["#e8c98a","#7a5230"]];
const photoBg = p => p.url ? `background-image:url('${p.url}'); background-size:cover; background-position:center` : `background:linear-gradient(135deg, ${p.g[0]}, ${p.g[1]})`;
function feelingOf(word){ const w = String(word || "").toLowerCase().replace(/-/g, " "); const x = findWord(w); if (x) return {w, f:x.f}; if (ST.custom[w]) return {w, f:ST.custom[w]}; if (SYN2[w]) return {w, f:SYN2[w].f}; return null; }
const ladderName = (f, s) => FAMX[f] ? FAMX[f].ladder[Math.max(0, Math.min(4, (s || 3) - 1))][1] : LADDER[f][(s || 3) - 1];
const h2 = (text, extra) => `<h2 class="lbl">${text}</h2>${extra || ""}`;
const btn = (label, attrs, cls) => `<button type="button" class="btn${cls ? " " + cls : ""}" ${attrs || ""}>${label}</button>`;

/* ---------- kept entries: each can be changed or removed from its ⋯ button ---------- */
function keptCard(e){
  if (e.id == null) e.id = ST.nextId++;
  const P = pal(), meta = `<div class="ent-meta"><span>${e.time || "11:24 pm"}</span>${marksMeta(e.marks)}</div>`, more = `<button type="button" class="iconbtn sm" data-entsheet="${e.id}" aria-label="Change or remove this entry">${IC.more}</button>`;
  const wrap = body => `<div class="ent${ST.fresh === e.id ? " fresh" : ""}"><div class="ent-top"><div class="ent-body">${body}</div>${more}</div>${meta}</div>`;
  if (e.type === "media") return wrap(`<p class="entry"><b>${esc(e.kind)}:</b> ${esc(e.title)}</p><p class="entry"><span class="rating">${e.r} of 7 · ${SEW[e.r - 1][1]}</span>${e.current ? ` <span class="rating">Currently</span>` : ""}</p>${e.line ? `<p class="entry">${esc(e.line)}</p>` : ""}`);
  if (e.type === "quote") return wrap(`<blockquote class="qcard">“${esc(e.q)}”<small>${esc(e.who === "Overheard" || e.who === "A book or film" ? e.who : "Friend " + e.who)}${e.where ? `, ${esc(e.where)}` : ""}</small></blockquote>`);
  if (e.type === "place") return wrap(`<p class="entry"><b>Place:</b> ${esc(e.name)}</p>${e.first ? `<p class="entry">${marksMeta({first:true})}</p>` : ""}`);
  if (e.type === "keep") return wrap(`<div class="keeprow"><span class="photo" style="${photoBg(e.photo || {g:PHOTO_SUGG[1]})}"></span><p class="entry"><b>Keepsake:</b> ${esc(e.what)}</p></div>`);
  if (e.type === "span") return wrap(`<p class="entry"><b>Span:</b> ${esc(e.name)}</p><p class="entry spanline"><i style="background:${P[e.fam]}"></i>${esc(e.from)} to ${esc(e.to)} · ${FN[e.fam]}</p>`);
  if (e.type === "past") return wrap(`<p class="entry"><b>${esc(e.date)}:</b> ${esc(e.text)}</p><p class="hint">Written later, on 29 Sep 2026</p>`);
  if (e.type === "person") return wrap(`<p class="entry"><b>${esc(e.how)}:</b> ${e.who.map(w => `<button type="button" class="mention" data-go="person:${w}" style="--pc:${personCol(w)}"><b aria-hidden="true">@</b>${w}</button>`).join(" ")}</p>`);
  if (e.type === "voice") return wrap(`<p class="entry"><b>Voice note</b> · 0:42</p><div class="wave" aria-hidden="true">${Array.from({length:28}, (_, i) => `<i style="height:${6 + Math.round(12 * Math.abs(Math.sin(i * 1.7)))}px"></i>`).join("")}</div>`);
  return wrap(`<p class="entry">${richText(e.text, "kept:" + e.id)}</p>`);
}

/* ---------- a postcard from Health: steps and sleep, drawn the way Health draws them (its dusk ink, its thin rings, its own colours) ---------- */
function healthPostcard(night){
  const C = night ? {bg:"#121016", edge:"#221e26", text:"#d8cfc3", quiet:"#a79d94", apricot:"#c99173", sage:"#7fae99", lav:"#9d90cc"} : {bg:"#151821", edge:"#272c37", text:"#ede9e3", quiet:"#a3a1a8", apricot:"#e9a77c", sage:"#8fc9b0", lav:"#b7a6f0"};
  const ring = (r, p, col) => { const c = 2 * Math.PI * r; return `<circle cx="50" cy="50" r="${r}" fill="none" stroke="${col}" stroke-opacity=".16" stroke-width="8"/><circle cx="50" cy="50" r="${r}" fill="none" stroke="${col}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${(p * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 50 50)"/>`; };
  const row = (col, k, v) => `<div class="hp-row"><i style="background:${col}"></i><span>${k}</span><b>${v}</b></div>`;
  return `<section class="hpost" style="--hp-bg:${C.bg}; --hp-edge:${C.edge}; --hp-text:${C.text}; --hp-quiet:${C.quiet}" aria-label="Postcard from Health">
    <div class="hp-head"><span>Postcard from Health</span><span>for yesterday, Monday 28</span></div>
    <div class="hp-body"><svg viewBox="0 0 100 100" class="hp-rings" role="img" aria-label="Health's three rings: workout closed, sleep nearly closed, steps three quarters">${ring(42, 1, C.apricot)}${ring(30, .86, C.lav)}${ring(18, .74, C.sage)}</svg>
      <div class="hp-nums"><p><b style="color:${C.sage}">7,420</b> steps</p><p><b style="color:${C.lav}">6 h 50 m</b> sleep</p></div></div>
    <div class="hp-list">${row(C.apricot, "Workout", "Upper body, 38 min")}${row(C.sage, "Check-in", "Done at 8:10 am")}${row(C.lav, "India walk", "12 km to Jaipur")}</div>
    <p class="hp-q">“An easy walking day. The knees filed no complaints.”</p>
    <p class="hp-note">Each day’s postcard arrives the next afternoon, once the day is really over.</p>
  </section>`;
}

/* ---------- Today: at 11 pm it is only the line, the feeling and the day overall. Everything else folds into one row. ---------- */
function pToday(){
  const P = pal(), v = VOICES[ST.voice % VOICES.length], ov = ST.overall;
  const moms = MOMENTS.map((m, i) => `<button type="button" class="mom${ST.fresh === "m" + i ? " fresh" : ""}" data-gloss="${esc(m.w)}" data-src="m:${i}" aria-label="${m.t} ${m.ap}, ${esc(m.w)}. Open its card">${formCanvas(m.f, m.f2)}<b>${m.t}</b><i>${esc(m.w)}</i></button>`).join("");
  const header = `<header class="thead onwall"><div class="hrow"><div class="hdate"><h1 class="tdate">Tuesday, 29 September</h1><p class="tstamp">${STAMP}</p></div><div class="hbtns"><button type="button" class="iconbtn" data-go="search" aria-label="Search">${IC.search}</button><button type="button" class="iconbtn" data-go="settings" aria-label="Settings">${IC.gear}</button></div></div><p class="voice">${v[1]}</p></header>`;
  const compose = `<section class="panel compose" aria-labelledby="h-line"><h2 class="lbl" id="h-line">Today’s line</h2>
      <div class="composer"><div class="hl" aria-hidden="true">${hlHTML(ST.draft)}</div><textarea id="p-line" placeholder="Today in a line, or a few…" aria-label="Today’s line" aria-describedby="h-hint">${esc(ST.draft)}</textarea><div class="sugg" id="p-sugg" hidden></div></div>
      <p class="hint" id="h-hint">Type # for a tag, @ for a person, : for a feeling. Tap a feeling to see its card.</p>
      <div class="marks" role="group" aria-label="Marks for this entry">${MARKS.map(([k, lab, icon]) => `<button type="button" class="mark${ST.marks[k] ? " on" : ""}" data-mark="${k}" aria-pressed="${!!ST.marks[k]}" style="${markStyle(k)}">${icon}<span>${lab}</span></button>`).join("")}</div>
      <button type="button" class="btn primary wide" data-act="save"${ST.draft.trim() ? "" : " disabled"}>Keep this line</button></section>`;
  const kept = ST.kept.length ? `<section class="panel">${h2("Kept today")}${ST.kept.map(keptCard).join("")}</section>` : "";
  const overall = `<div class="overall"><span class="ov-form">${formCanvas(ov.f)}</span><div class="ov-text"><p class="ov-l">The day overall${ov.set ? "" : ", suggested from your moments"}</p><p class="ov-w"><b>${FN[ov.f]}</b>, like ${esc(ladderName(ov.f, ov.s).toLowerCase())}</p></div></div>
      <div class="btnrow">${ov.set ? `<span class="done">${IC.first}Set for today</span>` : btn("That’s it", `data-act="overallyes"`, "primary")}${btn("Change", `data-act="overallchange"`)}</div>`;
  const weather = `<section class="panel" aria-labelledby="h-weather"><h2 class="lbl" id="h-weather">Inner weather</h2><div class="moms" role="list">${moms}</div>${btn(`${IC.plus}Add a feeling`, `data-go="add"`, "wide")}${overall}${btn("Open today’s page", `data-go="day"`, "ghost wide")}</section>`;
  const photos = ST.photos.map((p, i) => `<button type="button" class="ph${ST.potd === i ? " potd" : ""}" data-potd="${i}" style="${photoBg(p)}" aria-pressed="${ST.potd === i}" aria-label="Photo ${i + 1}${ST.potd === i ? ", photo of the day" : ". Make it the photo of the day"}">${ST.potd === i ? `<b>${IC.first}</b>` : ""}</button>`).join("");
  const sugg = PHOTO_SUGG.map((g, i) => ST.photos.some(p => p.sugg === i) ? "" : `<button type="button" class="ph phs" data-suggph="${i}" style="background:linear-gradient(135deg, ${g[0]}, ${g[1]})" aria-label="Add suggested photo ${i + 1}"><b>${IC.plus}</b></button>`).join("");
  const seen = PEOPLE.filter(p => p[1] <= 1);
  const extras = [
    `<section class="panel">${h2("Today’s photos")}${ST.photos.length ? `<div class="phrow">${photos}</div><p class="hint">Tap a photo to make it the photo of the day. Photos stay on your phone.</p>` : `<p class="hint">None yet. Photos stay on your phone.</p>`}
      <button type="button" class="btn wide" data-act="pickphotos">${IC.photo}Add from your phone</button><input type="file" id="p-photos" accept="image/*" multiple hidden>
      ${sugg ? `<p class="subl">Taken today, from Google Photos</p><div class="phrow">${sugg}</div>` : ""}</section>`,
    healthPostcard(ST.eve),
    `<section class="panel">${h2("Together today")}<div class="faces">${seen.map(p => face(p[0], true)).join("")}</div><p class="hint">Friend R and Friend J, from your line and your photos.</p>${btn(`${IC.plus}Someone else`, `data-go="form:person"`, "ghost")}</section>`,
    `<section class="panel">${h2("Grateful for")}<input class="sinput" id="p-grateful" value="${esc(ST.grateful)}" placeholder="One small thing…" aria-label="Grateful for"></section>`,
    `<section class="panel">${h2("Song of the week")}<div class="song"><span class="art" style="background:linear-gradient(135deg, ${P.warm}, ${P.curious})" aria-hidden="true"></span><div><b>Kun Faya Kun</b><span>A. R. Rahman · 9 plays this week, from Last.fm</span></div></div>${btn(ST.songKept ? "Added to today" : "Add to today", `data-act="song" aria-pressed="${ST.songKept}"`, ST.songKept ? "ghost" : "")}</section>`,
    `<section class="panel">${h2(`Today’s stamps`)}<div class="stamps">${(ST.stampsOpen ? STAMPS : STAMPS.slice(0, 4)).map(([k, val]) => `<p class="stamp"><b>${k}</b>${esc(val)}</p>`).join("")}</div>${btn(ST.stampsOpen ? "Show fewer" : `Show all ${STAMPS.length}`, `data-act="stamps" aria-expanded="${ST.stampsOpen}"`, "ghost wide")}</section>`,
    `<section class="panel">${h2("On this day, 2025")}<p class="entry">Your first walk in the monsoon. ${richText("#rain")}</p>${btn("Then and now", `data-go="alm:random"`, "ghost")}</section>`
  ];
  const summary = [ST.photos.length ? `${ST.photos.length} photo${ST.photos.length === 1 ? "" : "s"}` : "photos", "yesterday from Health", `with R and J`, "the song", `${STAMPS.length} stamps`, "on this day"].join(" · ");
  const sofar = ST.eve && !ST.more ? `<button type="button" class="sofar" data-act="more" aria-expanded="false"><span class="sf-l">Today so far</span><span class="sf-s">${summary}</span><span class="sf-i">${IC.down}</span></button>`
    : `${extras.join("")}${ST.eve ? `<button type="button" class="btn ghost wide" data-act="more" aria-expanded="true">${IC.up}Fold away</button>` : ""}`;
  const order = ST.eve ? [header, compose, kept, weather, sofar] : [header, compose, kept, extras[0], weather, extras[1], extras[2], extras[4], extras[5], extras[6], extras[3]];
  return `<canvas class="wall" data-scene="monthwall" aria-hidden="true"></canvas><div class="scr">${sbar()}<div class="content scroll">${order.join("")}</div>${overlays()}${tabsP()}</div>`;
}
/* Anything that sits over a screen: the feeling card, the entry menu, and the Undo notice. */
function overlays(){ return glossSheet() + entSheet() + (ST.toast ? `<div class="toast" role="status"><span>${esc(ST.toast.msg)}</span>${ST.toast.undo ? `<button type="button" class="btn sm" data-act="undo">Undo</button>` : ""}</div>` : ""); }

/* ---------- the feeling card: a word's meaning, family and strength, and a way to remove it ---------- */
function glossSheet(){
  const g = ST.gloss; if (!g) return "";
  const P = pal(), fo = feelingOf(g.w); if (!fo) return "";
  const x = findWord(fo.w), syn = !x && SYN2[fo.w], f = fo.f, fx = FAMX[f];
  const s = g.src && g.src.startsWith("m:") && MOMENTS[+g.src.slice(2)] ? MOMENTS[+g.src.slice(2)].s || 3 : (x && x.s) || 3;
  const rel = x ? x.rel.filter(r => WORDINDEX[r]).slice(0, 5) : syn ? syn.ws.filter(w => findWord(w)).slice(0, 4) : [];
  const where = g.src === "draft" ? "from this line" : g.src && g.src.startsWith("m:") ? "from today" : "from this entry";
  return `<div class="sheet gloss" role="dialog" aria-modal="true" aria-labelledby="gl-w">
    <div class="gl-top"><span class="gl-form">${formCanvas(f)}</span><div><p class="gl-w" id="gl-w">${esc(fo.w)}</p><p class="gl-fam" style="color:${inkOf(P[f], ground().solid)}">${FN[f]} · ${esc(fx ? fx.holds : FAMNOTE[f])}</p></div></div>
    <p class="entry">${esc(x ? x.m : syn ? `An everyday word. It usually means ${syn.ws.filter(w => findWord(w)).join(" or ")}.` : "Your own word.")}${x && x.lang ? ` From ${esc(x.lang)}.` : ""}</p>
    <div class="gl-str"><span class="rungs sm" aria-hidden="true">${[1,2,3,4,5].map(k => `<i class="${k <= s ? "on" : ""}" style="--fc:${P[f]}"></i>`).join("")}</span><p class="entry"><b>${esc(ladderName(f, s))}</b>, strength ${s} of 5</p></div>
    ${rel.length ? `<p class="subl">Close to</p><div class="chips">${rel.map(r => `<button type="button" class="chip" data-gloss="${esc(r)}" data-src="${esc(g.src || "")}" style="--fc:${P[findWord(r).f]}">${esc(r)}</button>`).join("")}</div>` : ""}
    <div class="btnrow">${g.src ? btn(`Remove ${where}`, `data-act="glossremove"`, "danger") : ""}${btn("Close", `data-act="glossclose"`, "primary")}</div>
  </div>`;
}
function entSheet(){
  if (ST.entSheet == null) return ""; const e = ST.kept.find(k => k.id === ST.entSheet); if (!e) return "";
  return `<div class="sheet" role="dialog" aria-modal="true" aria-label="This entry"><p class="tdate sm">This entry</p><p class="hint">Kept at ${e.time || "11:24 pm"}.</p>
    <div class="btnrow col">${e.text != null ? btn("Change the words", `data-act="entedit"`, "wide") : ""}${btn("Remove it", `data-act="entremove"`, "danger wide")}${btn("Close", `data-act="entclose"`, "primary wide")}</div></div>`;
}

/* ---------- the feeling picker: the save bar stays in reach and always says what it will keep ---------- */
function feelingResults(q){
  q = q.trim().toLowerCase(); if (!q) return "";
  const P = pal(), hits = feelingMatches(q, 9);
  const out = hits.map(h => { if (h.kind === "slang"){ const ws = SYN2[h.w].ws.filter(w => findWord(w)); return `<div class="sitem"><p class="hint">“${esc(h.w)}” usually means</p><div class="chips">${ws.map(w => `<button type="button" class="chip" data-addword="${esc(w)}" style="--fc:${P[findWord(w).f]}">${esc(w)}</button>`).join("")}<button type="button" class="chip dashed" data-custom="${esc(SYN2[h.w].f)}" data-cword="${esc(h.w)}">Keep “${esc(h.w)}” itself</button></div></div>`; }
    return `<button type="button" class="fres-item" data-addword="${esc(h.w)}">${glyphCanvas(h.f)}<span><b>${esc(h.w)}</b> · ${FN[h.f]}<small>${esc(h.note)}</small></span></button>`; }).join("");
  const own = !hits.some(h => h.w === q) ? `<div class="sitem"><p class="hint">Keep “${esc(q)}” as your own word. Which family is it closest to?</p><div class="chips">${FAMS.map(f => `<button type="button" class="chip" data-custom="${f}" data-cword="${esc(q)}" style="--fc:${P[f]}">${FN[f]}</button>`).join("")}</div></div>` : "";
  return `<div class="fres">${out || `<p class="hint">Nothing in the dictionary yet.</p>`}${own}</div>`;
}
function pinbar(){
  const A = ST.add, sel = findWord(A.word), q = (A.q || "").trim(), ok = !!sel && !q, when = ST.when;
  const label = ok ? `Keep “${esc(sel.w)}”${A.f2 ? ` with ${FN[A.f2].toLowerCase()}` : ""}` : "Pick a word first";
  const sub = ok ? `${esc(ladderName(A.fam, A.s))} · ${when === "now" ? "right now, 11:24 pm" : "as the day overall"}` : q ? "Choose one from the list above" : "Tap a word below";
  return `<div class="pinbar"><button type="button" class="btn primary big" data-act="keepfeeling"${ok ? "" : " disabled"}><span>${label}</span><small>${sub}</small></button>${when === "now" ? `<button type="button" class="btn ghost" data-act="keepanother"${ok ? "" : " disabled"}>Keep it, then add another</button>` : ""}</div>`;
}
function pAdd(){
  const P = pal(), A = ST.add, f = A.fam, fx = FAMX[f], sel = findWord(A.word), q = A.q || "";
  const tiles = FAMS.map(x => `<button type="button" class="ftile${x === f ? " on" : ""}" data-addfam="${x}" style="--fc:${P[x]}" aria-pressed="${x === f}">${formCanvas(x)}<b>${FN[x]}</b></button>`).join("");
  const chip = w => { const on = sel && sel.w === w; return `<button type="button" class="chip${on ? " on" : ""}" data-addword="${esc(w)}" aria-pressed="${on}" style="${fillVars(P[f])}">${esc(w)}</button>`; };
  const groups = ATLAS.WORDS[f].map(([g, ws]) => `<div class="fgroup"><h3 class="subl">${esc(g)}</h3><div class="chips">${ws.map(w => chip(w[0])).join("")}</div></div>`).join("");
  const rare = ATLAS.RARE.filter(x => x[2] === f), blends = ATLAS.BLENDS.filter(b => b.a === f || b.b === f), own = Object.entries(ST.custom).filter(([w, cf]) => cf === f);
  const rungs = [1,2,3,4,5].map(k => `<button type="button" class="rung${k <= A.s ? " on" : ""}" data-adds="${k}" aria-pressed="${k === A.s}" aria-label="Strength ${k} of 5: ${esc(ladderName(f, k))}" style="--fc:${P[f]}"><i></i></button>`).join("");
  const nus = sel ? sel.nu.map(n => `<button type="button" class="chip${n === A.nu ? " on" : ""}" data-addnu="${esc(n)}" aria-pressed="${n === A.nu}" style="${fillVars(P[f])}">${esc(n)}</button>`).join("") : "";
  const card = sel && sel.f === f ? `<section class="wordcard" style="--fc:${P[f]}">
      <p class="wbig">${esc(sel.w)}${A.f2 ? ` <span class="wlang">with ${FN[A.f2].toLowerCase()}</span>` : ""}</p>${sel.lang ? `<p class="wlang">From ${esc(sel.lang)}</p>` : ""}<p class="entry">${esc(sel.m)}</p>
      ${nus ? `<h3 class="subl">What it was about</h3><div class="chips">${nus}</div>` : ""}
      <h3 class="subl">How strong</h3><div class="rungs">${rungs}</div><p class="entry"><b>${esc(ladderName(f, A.s))}</b>, ${A.s} of 5</p></section>` : `<p class="hint">Pick a word below.</p>`;
  return `<div class="scr">${sbar()}<div class="content scroll picker">
    <header class="thead row2"><button type="button" class="back" data-go="back" aria-label="Back">${IC.back}</button><h1 class="tdate sm">How do you feel?</h1></header>
    <div class="switch" role="group" aria-label="When"><button type="button" data-when="now" aria-pressed="${ST.when === "now"}">Right now</button><button type="button" data-when="day" aria-pressed="${ST.when === "day"}">The whole day</button></div>
    <input class="sinput" id="p-fsearch" type="search" placeholder="Type any feeling, even “meh”" value="${esc(q)}" aria-label="Search all feelings">
    <div id="p-fres">${feelingResults(q)}</div>
    <div id="p-fbody" class="fbody"${q.trim() ? " hidden" : ""}>
      <p class="hint">242 feelings in nine families, 51 words from other languages, everyday slang and your own words.</p>
      <div class="fgrid" role="group" aria-label="Feeling families">${tiles}</div>
      ${card}
      <section class="panel"><h2 class="lbl">${FN[f]}: ${esc(fx.holds)}</h2>${groups}
        ${rare.length ? `<div class="fgroup"><h3 class="subl">From other languages</h3><div class="chips">${rare.map(x => chip(x[0])).join("")}</div></div>` : ""}
        ${own.length ? `<div class="fgroup"><h3 class="subl">Your words</h3><div class="chips">${own.map(([w]) => chip(w)).join("")}</div></div>` : ""}
        ${blends.length ? `<div class="fgroup"><h3 class="subl">Mixed feelings</h3><div class="chips">${blends.map(b => { const other = b.a === f ? b.b : b.a, on = A.blend === b.n; return `<button type="button" class="chip${on ? " on" : ""}" data-addblend="${esc(b.n)}" aria-pressed="${on}" style="${fillVars(P[other])}">${esc(b.n)}, with ${FN[other].toLowerCase()}</button>`; }).join("")}</div></div>` : ""}
      </section>
    </div>
  </div>${pinbar()}${overlays()}</div>`;
}

/* ---------- calendar: each day shows the form of its main feeling, so it reads without colour ---------- */
function minical(days, f){
  let out = `<span class="blank"></span>`.repeat(SEP_OFFSET);
  for (let d = 1; d <= 30; d++){ const on = days.includes(d); out += `<span class="${on ? "on" : ""}" style="${fillVars(pal()[f])}">${d}${on ? `<i class="sr">, lit</i>` : ""}</span>`; }
  return `<div class="minical">${out}</div>`;
}
function formKey(fams){ return `<div class="formkey">${fams.map(f => `<span>${glyphCanvas(f)}${FN[f]}</span>`).join("")}</div>`; }
function emoBody(){
  const P = pal(), counts = monthCounts(), sel = ST.emo;
  const cells = FAMS.map(f => { const on = !!(sel && sel.kind === "fam" && sel.key === f); return `<button type="button" class="emocell${on ? " on" : ""}" data-emo="fam:${f}" aria-pressed="${on}" style="--fc:${P[f]}">${formCanvas(f)}<b>${FN[f]}</b><span>${counts[f]} moments</span></button>`; }).join("");
  const words = wordCounts().slice(0, 10);
  const wchips = words.map(([w, v]) => { const on = !!(sel && sel.kind === "word" && sel.key === w); return `<button type="button" class="chip${on ? " on" : ""}" data-emo="word:${esc(w)}" aria-pressed="${on}" style="${fillVars(P[v.f])}">${esc(w)} · ${v.n}</button>`; }).join("");
  const detail = kind => { if (!sel || sel.kind !== kind) return "";
    const days = MONTH.filter(d => kind === "fam" ? d.parts.includes(sel.key) : d.words.includes(sel.key)).map(d => d.d), wi = WORDINDEX[sel.key], f = kind === "fam" ? sel.key : (wi ? wi.f : "calm");
    const text = kind === "fam" ? `<b>${days.length} days</b> had some ${FN[sel.key].toLowerCase()} in them. Your words for it: ${[...new Set(MONTH.flatMap(d => d.words.filter((w, i) => d.parts[i] === sel.key)))].map(esc).join(", ")}.` : `<b>${days.length} days</b> you felt ${esc(sel.key)}.${wi ? ` ${esc(wi.m)}` : ""}`;
    return `<div class="sel-box"><p class="entry">${text}</p>${minical(days, f)}<p class="hint">Days with it are filled in and read “lit”.</p></div>`; };
  return `<p class="emo-sum">Mostly <b>warm</b> and <b>calm</b> this month, with a tense stretch in the busy week (7 to 11 Sep) and a curious one on the trip.</p>
    <section class="panel">${h2("The nine, this month")}<div class="emogrid">${cells}</div>${sel && sel.kind === "fam" ? detail("fam") : `<p class="hint">Tap one to see its days.</p>`}</section>
    <section class="panel">${h2("Words you reached for")}<div class="chips">${wchips}</div>${detail("word")}</section>
    <section class="panel">${h2("Through the day")}<canvas class="clock" data-scene="clock" role="img" aria-label="Feelings by hour: tense in the mornings, warm in the evenings, wistful late at night"></canvas><p class="entry">Tense in the mornings, warm in the evenings, wistful late at night.</p></section>
    <section class="panel">${h2("Often together")}${OFTEN.map(([t, fs]) => `<div class="often">${tagChip(t)}<span class="of-with">often with</span><span class="of-f">${fs.map(f => `<span>${glyphCanvas(f)}${FN[f].toLowerCase()}</span>`).join("")}</span></div>`).join("")}<p class="hint">The feelings that most often share a day with each tag. Nothing here is better or worse.</p></section>
    <section class="panel">${h2("Who you were with")}${[["R",["bright","warm"]],["J",["calm","curious"]]].map(([p, fs]) => `<div class="often">${face(p)}<span class="of-with">days together were often</span><span class="of-f">${fs.map(f => `<span>${glyphCanvas(f)}${FN[f].toLowerCase()}</span>`).join("")}</span></div>`).join("")}</section>`;
}
function calBody(){
  const P = pal(), head = ["M","T","W","T","F","S","S"].map((d, i) => `<span class="mh" aria-hidden="true">${d}</span>`).join("");
  if (ST.calTab === "days"){
    let cells = `<span class="mc blank"></span>`.repeat(SEP_OFFSET);
    MONTH.forEach(day => {
      if (!day.parts.length){ cells += `<span class="mc future"><span class="dn">${day.d}</span></span>`; return; }
      const span = SPANS.find(s => day.d >= s.from && day.d <= s.to);
      const lab = `${day.d} September: mostly ${FN[day.overall].toLowerCase()}, ${day.parts.length} moments${day.first ? ", a first" : ""}${span ? ", part of " + span.name : ""}`;
      cells += `<button type="button" class="mc${day.d === 29 ? " today" : ""}${span ? " inspan" : ""}" data-day="${day.d}" aria-label="${lab}"${span ? ` style="--sc:${P[span.fam]}"` : ""}><span class="dn">${day.d}</span>${glyphCanvas(day.overall, "")}${day.first ? `<span class="mk">${IC.first}</span>` : ""}</button>`;
    });
    const kept = MONTH.filter(d => d.parts.length), moments = kept.reduce((a, d) => a + d.parts.length, 0), fams = [...new Set(kept.map(d => d.overall))];
    return `<p class="hint">Each day shows the form of its main feeling. ${IC.first} marks a first. A line along the top means the day is part of a span.</p>${formKey(fams)}<div class="cal" role="group" aria-label="September">${head}${cells}</div>
      <section class="panel">${h2("September so far")}<p class="entry">${kept.length} days kept, ${moments} moments, ${kept.filter(d => d.first).length} firsts, ${kept.filter(d => d.photo).length} days with photos.</p>${SPANS.map(s => `<p class="entry spanline"><i style="background:${P[s.fam]}"></i><b>${s.name}</b>, ${s.from} to ${s.to} September</p>`).join("")}</section>`;
  }
  if (ST.calTab === "gallery"){
    let cells = `<span class="gc2 blank"></span>`.repeat(SEP_OFFSET);
    MONTH.forEach(day => { cells += !day.parts.length ? `<span class="gc2 future"><span class="gd">${day.d}</span></span>` : `<button type="button" class="gc2${day.d === 29 ? " today" : ""}" data-day="${day.d}" aria-label="${day.d} September"><canvas data-scene="bloomcell" data-parts="${day.parts.join(",")}" aria-hidden="true"></canvas><span class="gd">${day.d}</span></button>`; });
    return `<p class="hint">Each day as a small sun-path: the forms sit at the hour you felt them, the centre is the day overall. Tap one to read it.</p><div class="gal">${head}${cells}</div>`;
  }
  if (ST.calTab === "year"){
    const scene = ST.ystyle === "pixels" ? "ypixels" : "yradial", fams = [...new Set(yearDays().filter(Boolean))];
    return `<div class="ystyle" role="group" aria-label="Year style">${[["radial","Ring"],["pixels","Pixels"]].map(([k, l]) => `<button type="button" class="chip${ST.ystyle === k ? " on ink" : ""}" data-ystyle="${k}" aria-pressed="${ST.ystyle === k}">${l}</button>`).join("")}</div>
      <canvas class="ycanvas" data-scene="${scene}" tabindex="0" role="img" aria-label="2026 as ${ST.ystyle === "pixels" ? "a grid of days" : "a ring of days"}. Tap a day, or use the arrow keys, to read it."></canvas>
      <p class="hint">Tap any day, or use the arrow keys, to read it.</p><p class="entry">Mostly calm in March, tense in May, wistful in the July rains, warm since August.</p>${formKey(fams)}`;
  }
  if (ST.calTab === "life") return lifeBody();
  return emoBody();
}
function daySheet(d){
  const day = MONTH.find(x => x.d === d); if (!day || !day.parts.length) return "";
  const prev = MONTH.slice(0, d - 1).reverse().find(x => x.parts.length), next = MONTH.slice(d).find(x => x.parts.length);
  return `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="ds-t"><div class="row3"><p class="tdate sm" id="ds-t">${d} September</p><button type="button" class="iconbtn" data-act="closesheet" aria-label="Close">${IC.close}</button></div><canvas data-scene="bloomday" data-parts="${day.parts.join(",")}" aria-hidden="true"></canvas><p class="entry">${esc(day.words.join(", then "))}.</p><p class="hint">${day.parts.length} moments${day.photo ? ", a photo" : ""}${day.first ? ", a first" : ""}.</p>
    <div class="btnrow">${prev ? btn(`${IC.back}${prev.d} Sep`, `data-day="${prev.d}" aria-label="Previous day, ${prev.d} September"`) : ""}${btn("Open this day", `data-go="day"`, "primary")}${next ? btn(`${next.d} Sep${IC.next}`, `data-day="${next.d}" aria-label="Next day, ${next.d} September"`) : ""}</div></div>`;
}
function pCal(){
  const title = ST.calTab === "year" ? "2026" : ST.calTab === "life" ? "Your life, 2019 to 2026" : "September 2026";
  return `<div class="scr">${sbar()}<div class="content scroll"><header class="thead"><h1 class="tdate sm">${title}</h1></header><div class="ctabs" role="tablist" aria-label="Calendar views">${[["days","Days"],["gallery","Gallery"],["year","Year"],["life","Life"],["emotions","Feelings"]].map(([k, l]) => `<button type="button" role="tab" aria-selected="${k === ST.calTab}" class="${k === ST.calTab ? "on" : ""}" data-caltab="${k}">${l}</button>`).join("")}</div>${calBody()}</div>${ST.dayOpen ? daySheet(ST.dayOpen) : ""}${ST.calTab === "year" ? yearPickSheet() : ""}${overlays()}${tabsP()}</div>`;
}

/* ---------- the day page: the picture on top, and the story underneath as the one place to read each moment ---------- */
function storyItems(){
  const P = pal();
  return MOMENTS.map((m, i) => { const extra = m.f === "warm" && m.t === "6:40" ? `<p class="entry">${richText(LINE_TAGGED)}</p><div class="st-photos"><span class="photo" style="background:linear-gradient(135deg, ${mix(P.warm, "#9fb3c8", .5)}, ${mix(P.bright, "#2b3444", .55)})"></span><span class="photo" style="background:linear-gradient(200deg, ${mix(P.calm, "#9fb3c8", .5)}, ${mix(P.warm, "#2b3444", .55)})"></span></div><div class="faces">${face("R", true)}${face("J", true)}</div><div class="ent-meta">${marksMeta({first:true})}<span>at a new café by the metro</span></div>` : "";
    const echo = m.f === "wistful" ? `<button type="button" class="echo" data-go="alm:random">Echo: you felt this way on 14 March, after the same song</button>` : "";
    return `<div class="st-item">${formCanvas(m.f, m.f2)}<div class="st-body"><p class="st-time">${m.t} ${m.ap}</p><p class="st-word">${esc(m.w)}${m.n ? ` <span>${esc(m.n)}</span>` : ""}</p><p class="st-wx">${FN[m.f]}${m.f2 ? ` with ${FN[m.f2].toLowerCase()}` : ""}, like ${esc(ladderName(m.f, m.s).toLowerCase())}</p>${extra}${echo}</div></div>`; }).join("");
}
const DAYSTYLES = [["bloomline","Bloom"],["score","Score"]];
function dayScreen(style, inProto){
  const P = pal(), grad = `linear-gradient(in oklch, ${MOMENTS.map(m => P[m.f]).join(", ")})`;
  const chooser = inProto ? `<div class="dstyles" role="group" aria-label="Day page style">${DAYSTYLES.map(([k, l]) => `<button type="button" class="chip${style === k ? " on ink" : ""}" data-daystyle="${k}" aria-pressed="${style === k}">${l}</button>`).join("")}</div>` : "";
  const back = inProto ? `<button type="button" class="back onpic" data-go="back" aria-label="Back">${IC.back}</button>` : "";
  const story = `<section class="panel story" style="--daygrad:${grad}" aria-label="The day, moment by moment">${storyItems()}</section>`;
  const head = `<header class="thead onwall">${back}<h1 class="tdate sm">Tuesday, 29 September</h1><p class="tstamp">${STAMP}</p></header>`;
  const tabs = inProto ? tabsP() : tabsP("cal");
  if (style === "score") return `<div class="scr ds-score">${sbar()}<div class="content scroll">${back}${chooser}<div class="sc-head"><span>Tuesday</span><span>29 · 09 · 2026</span></div><p class="sc-title">A day in ${["one","two","three","four","five","six"][MOMENTS.length - 1] || MOMENTS.length} movements</p><canvas class="sc-staff short" data-scene="scoreline" role="img" aria-label="The day's moments on one line, by time"></canvas><p class="hint">Placed only by time. Bigger marks were felt more strongly.</p><p class="daylead">${REPORT}</p>${story}</div>${overlays()}${tabs}</div>`;
  const scene = "daybloomline";
  const centre = `<div class="dial-center"><b>Golden hour</b><span>warm, overall</span></div>`;
  return `<div class="scr ds-${style}">${sbar()}<div class="content scroll">${head}${chooser}<div class="dhero ${style}"><canvas data-scene="${scene}" role="img" aria-label="The day's colours, from morning to night"></canvas>${centre}</div><p class="daylead">${REPORT}</p>${story}</div>${overlays()}${tabs}</div>`;
}
function pDay(){ return dayScreen(ST.dayStyle, true); }
