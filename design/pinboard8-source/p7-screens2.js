/* ---------- the + sheet: Feeling, the kind you add most, sits at the bottom, nearest your thumb ---------- */
function pAddSheet(){
  const others = ADDKINDS.filter(k => k[0] !== "feeling"), fe = ADDKINDS.find(k => k[0] === "feeling");
  return `<div class="scr">${sbar()}<div class="content scroll"><header class="thead row2"><button type="button" class="back" data-go="back" aria-label="Back">${IC.back}</button><h1 class="tdate sm">Add</h1></header>
    <div class="addgrid">${others.map(([k, lab, sub]) => `<button type="button" class="addtile" data-go="form:${k}"><span class="addico">${ADDICON[k]}</span><b>${lab}</b><span>${sub}</span></button>`).join("")}</div>
    <p class="hint">You can also type straight into today’s line: # for a tag, @ for a person, : for a feeling.</p>
    <button type="button" class="addtile feel" data-go="add"><span class="addico">${ADDICON.feeling}</span><b>${fe[1]}</b><span>${fe[2]}</span></button></div>${tabsP("")}</div>`;
}
const SEWTXT = r => `${r} of 7 · ${SEW[r - 1][1]}`;
function pForm(){
  const P = pal(), k = ST.form, F = ST.fm = Object.assign({kind:"Film", r:5, who:"Overheard", fam:"bright", who2:[], how:"In person", photo:null, current:false}, ST.fm), title = (ADDKINDS.find(a => a[0] === k) || [0, "Add"])[1];
  const pick = (attr, val, on, label) => `<button type="button" class="chip${on ? " on ink" : ""}" ${attr}="${esc(val)}" aria-pressed="${on}">${esc(label || val)}</button>`;
  let body = "";
  if (k === "media"){
    body = `<div class="chips" role="group" aria-label="Kind">${["Film","Series","Book","Game","Album","Other"].map(x => pick("data-fmkind", x, F.kind === x)).join("")}</div>
      <label class="field"><span>Title</span><input class="sinput" id="f-title" value="${esc(F.title || "Past Lives")}"></label>
      <div class="posterrow"><span class="poster" style="background:linear-gradient(160deg, ${P.wistful}, ${mix(P.low, "#101820", .4)})"><b>Past Lives</b></span><p class="hint">The poster and year come from Wikipedia when it finds a match. You can change them.</p></div>
      <h2 class="lbl">Your rating</h2><div class="sewrow" role="group" aria-label="Rating, 1 to 7">${SEW.map(([n, lab]) => `<button type="button" class="sewbtn${F.r === n ? " on" : ""}" data-fmr="${n}" aria-pressed="${F.r === n}" aria-label="${n}, ${lab}">${n}</button>`).join("")}</div>
      <p class="sewlab">${SEWTXT(F.r)}${F.r === 4 ? " (the true middle)" : ""}</p>
      <label class="field"><span>One line about it</span><input class="sinput" id="f-line"></label>
      <label class="toggle"><input type="checkbox" id="f-cur"${F.current ? " checked" : ""}><span>Pin to Currently (still watching or reading)</span></label>`;
  } else if (k === "quote"){
    body = `<label class="field"><span>What was said</span><textarea class="note" id="f-quote">We’re not lost, we’re just early for somewhere else.</textarea></label>
      <h2 class="lbl">Who said it</h2><div class="chips">${[...PEOPLE.slice(0, 5).map(p => p[0]), "Overheard", "A book or film"].map(w => pick("data-fmwho", w, F.who === w, w.length === 1 ? "Friend " + w : w)).join("")}</div>
      <label class="field"><span>Where (optional)</span><input class="sinput" id="f-where"></label>`;
  } else if (k === "place"){
    body = `<label class="field"><span>Place name</span><input class="sinput" id="f-place" value="A new café by the metro"></label><p class="hint">Suggested from OpenStreetMap near you. You can rename any place.</p>
      <div class="chips">${pick("data-fmplace", "cafe", F.place !== "stall", "A new café by the metro, 0.3 km")}${pick("data-fmplace", "stall", F.place === "stall", "The chai stall, 0.4 km")}</div>
      <label class="toggle"><input type="checkbox" id="f-first" checked><span>This is a first</span></label>
      <canvas class="mapmini" data-scene="placemap" role="img" aria-label="A small drawn map of nearby places"></canvas><p class="hint">Logbook draws its own small, rough map. The full map lives in the Places app later.</p>`;
  } else if (k === "keep"){
    body = `<button type="button" class="keepslot" data-act="pickkeep">${F.photo ? `<span class="photo" style="${photoBg(F.photo)}"></span>` : `<span>${IC.photo}Add a photo of it</span>`}</button><input type="file" id="f-keepphoto" accept="image/*" hidden>
      <label class="field"><span>What is it?</span><input class="sinput" id="f-what" value="Film ticket, Past Lives"></label>`;
  } else if (k === "span"){
    body = `<label class="field"><span>Name</span><input class="sinput" id="f-span" value="Diwali at home"></label><div class="daterow"><label class="field"><span>From</span><input class="sinput" type="date" id="f-from" value="2026-11-06"></label><label class="field"><span>To</span><input class="sinput" type="date" id="f-to" value="2026-11-10"></label></div>
      <h2 class="lbl">Its colour</h2><div class="swatches" role="group" aria-label="Span colour">${FAMS.map(f => `<button type="button" class="swatch${F.fam === f ? " on" : ""}" data-fmfam="${f}" aria-pressed="${F.fam === f}" style="--fc:${P[f]}"><i></i>${FN[f]}</button>`).join("")}</div><p class="hint">It shows as a line along those days in the calendar, with its name listed underneath, and on the life page.</p>`;
  } else if (k === "past"){
    body = `<label class="field"><span>When</span><input class="sinput" type="date" id="f-date" value="2022-06-14" max="2026-09-29"></label>
      <label class="field"><span>What happened</span><textarea class="note" id="f-past">Graduation day. Everyone cried, including the professor.</textarea></label>
      <p class="hint">It gets a “written later” stamp. Logbook fills in that day’s weather too, for any date after 1940.</p>`;
  } else if (k === "voice"){
    body = `<button type="button" class="micbtn" data-act="mic" aria-label="Record a voice note" disabled>${ADDICON.voice}</button><p class="hint center">Tap to record. Voice notes stay on your phone as audio. Recording is switched off in this preview.</p>`;
  } else if (k === "person"){
    body = `<h2 class="lbl">Who</h2><div class="faces pick">${PEOPLE.map(([i]) => `<button type="button" class="face${F.who2.includes(i) ? " seen" : ""}" data-fmp="${i}" style="--pc:${personCol(i)}" aria-pressed="${F.who2.includes(i)}" aria-label="Friend ${i}">${i}</button>`).join("")}</div>
      <h2 class="lbl">How</h2><div class="chips">${["In person","Call","Messages"].map(h => pick("data-fmhow", h, F.how === h)).join("")}</div><p class="hint">Calls and messages count as time together.</p>`;
  } else if (k === "photo"){
    body = `<button type="button" class="keepslot" data-act="pickformphotos"><span>${IC.photo}Choose from your phone</span></button><input type="file" id="f-photos" accept="image/*" multiple hidden><h2 class="lbl">Taken today, from Google Photos</h2><div class="phrow">${PHOTO_SUGG.map((g, i) => `<button type="button" class="ph phs" data-suggph="${i}" style="background:linear-gradient(135deg, ${g[0]}, ${g[1]})" aria-label="Add suggested photo ${i + 1}"><b>${IC.plus}</b></button>`).join("")}</div>`;
  }
  const keep = k === "voice" || k === "photo" ? "" : `<div class="pinbar"><button type="button" class="btn primary big" data-act="keepform"><span>Keep this ${k === "media" ? F.kind.toLowerCase() : k === "keep" ? "keepsake" : k === "past" ? "moment" : k}</span><small>It lands in today, at 11:26 pm</small></button></div>`;
  return `<div class="scr">${sbar()}<div class="content scroll"><header class="thead row2"><button type="button" class="back" data-go="back" aria-label="Back">${IC.back}</button><h1 class="tdate sm">${esc(title)}</h1></header><section class="panel formpanel">${body}</section></div>${keep}${keep ? "" : tabsP("")}</div>`;
}
function keepForm(){
  const k = ST.form, F = ST.fm, val = id => { const el = document.getElementById(id); return el ? el.value : ""; };
  let e = null;
  if (k === "media") e = {type:"media", kind:F.kind, title:val("f-title") || "Untitled", r:F.r, line:val("f-line"), current:!!(document.getElementById("f-cur") || {}).checked};
  else if (k === "quote") e = {type:"quote", q:val("f-quote") || "…", who:F.who, where:val("f-where")};
  else if (k === "place") e = {type:"place", name:val("f-place") || "A place", first:!!(document.getElementById("f-first") || {}).checked};
  else if (k === "keep") e = {type:"keep", what:val("f-what") || "A keepsake", photo:F.photo};
  else if (k === "span") e = {type:"span", name:val("f-span") || "A span", from:val("f-from"), to:val("f-to"), fam:F.fam};
  else if (k === "past") e = {type:"past", date:val("f-date"), text:val("f-past")};
  else if (k === "person") e = {type:"person", who:F.who2.length ? F.who2 : ["A"], how:F.how};
  if (e){ e.time = "11:26 pm"; e.id = ST.nextId++; ST.kept.unshift(e); ST.fresh = e.id; ST.toast = {msg:"Kept in today.", undo:{kind:"entry", id:e.id}}; }
  ST.hist = []; ST.screen = "today"; renderProto();
}
function pSettings(){
  const v = VOICES[ST.voice % VOICES.length], row = (t, d, right) => `<div class="setrow"><div><b>${t}</b><span>${d}</span></div>${right || ""}</div>`, on = lab => `<span class="state">${lab || "On"}</span>`;
  return `<div class="scr">${sbar()}<div class="content scroll"><header class="thead row2"><button type="button" class="back" data-go="back" aria-label="Back">${IC.back}</button><h1 class="tdate sm">Settings</h1></header>
    <section class="panel">${h2("Voice")}<div class="chips">${VOICES.map(([n], i) => `<button type="button" class="chip${ST.voice === i ? " on ink" : ""}" data-voice="${i}" aria-pressed="${ST.voice === i}">${esc(n)}</button>`).join("")}</div><p class="voice">${v[1]}</p></section>
    <section class="panel">${h2("Reading")}${row("The day page", "How each day is drawn", `<div class="chips">${DAYSTYLES.map(([k, l]) => `<button type="button" class="chip${ST.dayStyle === k ? " on ink" : ""}" data-daystyle="${k}" aria-pressed="${ST.dayStyle === k}">${l}</button>`).join("")}</div>`)}${row("Text size", "Follows your phone’s text setting. Everything grows with it.", on("Phone"))}${row("Light or dark", "Follows your phone", on("Phone"))}</section>
    <section class="panel">${h2("Backup")}${row("Monthly copy to Google Drive", "Last on 1 September, next on 1 October", on())}${row("Export everything now", "Markdown files and photo folders. They open without Logbook.", btn("Export", "", "sm"))}</section>
    <section class="panel">${h2("Privacy")}${row("Lock private entries", "Unlock with your phone’s fingerprint or PIN", on())}</section>
    <section class="panel">${h2("Your homes")}${row("Home 2", "Since 2025", on("Now"))}${row("Home 1", "2019 to 2025")}<p class="hint">Real names stay in your private starter file. Distance stamps take turns across your homes.</p></section>
    <section class="panel">${h2("Linked")}${row("Health", "A postcard of steps and sleep each day", on())}${row("Last.fm", "Two accounts, songs of the week", on())}${row("Google Maps Timeline", "Places since 2022", btn("Import", "", "sm"))}${row("Google Photos", "Suggests today’s photos", on())}</section>
    <section class="panel">${h2("Days")}${row("A day ends at 4 am", "Late nights count as the day before", on())}${row("Weeks start on Monday", "Sunday asks for the week in a line", on())}</section>
  </div>${tabsP()}</div>`;
}
const SHELVES = [["firsts","Firsts","21 this year"],["media","Films, books and shows","1 on the go"],["quotes","Quotes","3 this month"],["places","Places","38, of them 21 firsts"],["keeps","Keepsakes","4"],["bdays","Birthdays and gifts","Friend A’s in 12 days"],["songs","Songs of the week","36"],["spans","Spans","2 this month"]];
function pShelves(){
  return `<div class="scr">${sbar()}<div class="content scroll">
    <header class="thead"><h1 class="tdate sm">Shelves</h1><p class="tstamp">Everything, sorted by kind</p></header>
    <div class="shelftiles">${SHELVES.map(([k, l, n]) => `<button type="button" class="shelftile" data-go="shelf:${k}"><b>${l}</b><span>${n}</span></button>`).join("")}</div>
    <section class="panel">${h2("People")}<div class="shelfgrid">${PEOPLE.map(([i, d]) => `<button type="button" class="shelfp" data-go="person:${i}">${faceStatic(i, true)}<span>Friend ${i}</span></button>`).join("")}</div></section>
    <section class="panel">${h2("Tags")}<div class="tagcloud">${TAGS.map(t => tagChip(t)).join("")}</div><p class="hint">A tag’s colour is the feeling it most often comes with.</p></section>
  </div>${tabsP()}</div>`;
}
function pShelf(){
  const P = pal(), k = ST.shelf, title = (SHELVES.find(s => s[0] === k) || [0, "Shelf"])[1];
  const item = (lead, t, sub, right) => `<div class="pitem">${lead}<div><b>${t}</b><span>${sub}</span></div>${right || "<span></span>"}</div>`;
  let body = "";
  if (k === "firsts") body = [["29 Sep","A new café by the metro","warm"],["21 Sep","The best chai of your life, roadside","bright"],["19 Sep","The lake at the top","curious"],["2 Sep","First rain of the month","wistful"],["14 Jun","Swam in the sea","bright"]].map(([d, t, f]) => item(glyphCanvas(f), esc(t), `${d} · felt ${FN[f].toLowerCase()}`)).join("");
  else if (k === "media"){ const cur = MEDIA.find(m => m.current); body = `${cur ? `<div class="curcard"><span class="poster sm" style="background:linear-gradient(160deg, ${P[cur.fam]}, ${mix(P.low, "#101820", .4)})"></span><div><h2 class="lbl">Currently</h2><b>${esc(cur.title)}</b><span>${esc(cur.note)}</span></div></div>` : ""}` + MEDIA.map(m => item(`<span class="poster xs" style="background:linear-gradient(160deg, ${P[m.fam]}, ${mix(P.low, "#101820", .4)})"></span>`, esc(m.title), `${m.kind} · ${m.date} · ${esc(m.line)}`, `<span class="rating">${m.r} of 7</span>`)).join(""); }
  else if (k === "quotes") body = QUOTES.map(q => `<blockquote class="qcard">“${esc(q.q)}”<small>${q.who === "overheard" ? "Overheard" : "Friend " + q.who}, ${esc(q.where)} · ${q.date}</small></blockquote>`).join("");
  else if (k === "places") body = `<canvas class="mapbig" data-scene="placemap" role="img" aria-label="A drawn map of your places; firsts glow"></canvas>` + PLACES.filter(p => !p.home).map(p => item(glyphCanvas(p.fam), `${p.first ? "A first: " : ""}${esc(p.name)}`, `${p.visits} ${p.visits === 1 ? "visit" : "visits"}`)).join("");
  else if (k === "keeps") body = `<div class="keepgrid">${KEEPS.map((kp, i) => `<div class="keeptile"><span class="photo" style="background:linear-gradient(${135 + i * 40}deg, ${mix(P[kp.fam], "#9fb3c8", .4)}, ${mix(P[kp.fam], "#2b3444", .6)})"></span><b>${esc(kp.what)}</b><span>${kp.date}</span></div>`).join("")}</div>`;
  else if (k === "bdays") body = BDAYS.map(b => `<div class="bday">${faceStatic(b.who, true)}<div><b>Friend ${b.who}, ${b.when}</b><span>${b.in}</span>${b.gifts.map(g => `<p class="gift">${IC.gift}${esc(g)}</p>`).join("")}</div></div>`).join("");
  else if (k === "songs") body = SONGS.map(([w, t, a]) => item(`<span class="art" style="background:linear-gradient(135deg, ${P.curious}, ${P.warm})"></span>`, esc(t), `${esc(a)} · ${w}`)).join("");
  else if (k === "spans") body = [...SPANS.map(s => [s.name, `${s.from} to ${s.to} Sep 2026`, s.fam]), ["Monsoon walks", "5 to 20 Jul 2026", "wistful"], ["Deadline season", "4 to 15 May 2026", "tense"]].map(([n, d, f]) => item(`<span class="spanbar" style="background:${P[f]}"></span>`, esc(n), `${d} · ${FN[f]}`)).join("");
  return `<div class="scr">${sbar()}<div class="content scroll"><header class="thead row2"><button type="button" class="back" data-go="back" aria-label="Back">${IC.back}</button><h1 class="tdate sm">${esc(title)}</h1></header><section class="panel">${body}</section></div>${tabsP()}</div>`;
}
/* A person page describes time together. No "last seen N days ago", no "usually low". */
function pPerson(){
  const p = PEOPLE.find(x => x[0] === ST.person) || PEOPLE[0], [i, days, time] = p, rnd = prng(i.charCodeAt(0));
  const items = PERSONLOG.filter(it => ST.pfilter === "all" || (ST.pfilter === "photos" ? it.photo : it.kind === ST.pfilter.replace(/s$/, "")));
  let lastM = "", list = "";
  items.forEach(it => { if (it.m !== lastM){ list += `<h3 class="subl">${it.m}</h3>`; lastM = it.m; } list += `<div class="pitem">${glyphCanvas(it.mood)}<div><b>${esc(it.title)}</b><span>${it.date} · felt ${FN[it.mood].toLowerCase()}${it.first ? " · a first" : ""}${it.gift ? " · a gift" : ""}</span></div>${it.photo ? `<span class="photo" role="img" aria-label="photo"></span>` : "<span></span>"}</div>`; });
  const last = days <= 1 ? "today" : ["28 Sep","16 Sep","2 Sep","21 Aug","14 Aug","30 Aug","9 Sep"][i.charCodeAt(0) % 7];
  const bars = "JFMAMJJASOND".split("").map((mo, k) => { const v = k > 8 ? 0 : 2 + Math.round(rnd() * 6); return `<span class="tbar"><i style="height:${v ? v * 7 : 2}px"></i><b>${mo}</b></span>`; }).join("");
  return `<div class="scr">${sbar()}<div class="content scroll">
    <header class="thead row2"><button type="button" class="back" data-go="back" aria-label="Back">${IC.back}</button><h1 class="tdate sm">Friend ${i}</h1></header>
    <section class="panel"><div class="phead">${faceStatic(i, true)}<div><p class="entry"><b>Together ${time} days this year</b></p><p class="entry">Last together on ${last}. Birthday on 11 October.</p></div></div>
      <div class="setrow"><div><b>Their colour</b><span>A thread you pick. It never means a feeling.</span></div><button type="button" class="btn sm" data-act="pcolour" style="--pc:${personCol(i)}"><i class="dotc"></i>Change</button></div></section>
    <section class="panel">${h2("Days together, 2026")}<div class="tbars" role="img" aria-label="Days together each month">${bars}</div></section>
    <section class="panel"><div class="lblrow">${h2("Photos together, 23")}${btn("See all", `data-pfilter="photos"`, "ghost sm")}</div><div class="pgrid">${[0,1,2,3].map(k => `<span class="photo" style="background:linear-gradient(${135 + k * 30}deg, #9fb3c8, #3b4658)"></span>`).join("")}</div></section>
    <div class="pfilter" role="group" aria-label="Show">${["all","events","photos","moods"].map(k => `<button type="button" class="chip${ST.pfilter === k ? " on ink" : ""}" data-pfilter="${k}" aria-pressed="${ST.pfilter === k}">${k === "moods" ? "Feelings" : k[0].toUpperCase() + k.slice(1)}</button>`).join("")}</div>
    <section class="panel">${list || `<p class="entry">Nothing of this kind yet.</p>`}</section>
  </div>${tabsP()}</div>`;
}
function pTag(){
  const P = pal(), tag = ST.tag, tf = tagFam(tag);
  const items = [...ST.kept.filter(e => (e.tags || []).includes(tag)).map(e => ({date:"29 Sep", text:e.text, fam:"warm"})), ...PAST.filter(e => e.tags.includes(tag))];
  const byDay = {}; items.forEach(it => { byDay[parseInt(it.date, 10)] = it.fam; });
  const strip = Array.from({length:30}, (_, k) => { const f = byDay[k + 1]; return `<i class="${f ? "on" : ""}" style="${f ? `--fc:${P[f]}` : ""}"></i>`; }).join("");
  return `<div class="scr">${sbar()}<div class="content scroll">
    <header class="thead row2"><button type="button" class="back" data-go="back" aria-label="Back">${IC.back}</button><h1 class="tdate sm">${tagChip(tag)}</h1></header>
    <section class="panel"><p class="entry"><b>${items.length} ${items.length === 1 ? "entry" : "entries"}</b> this month. Its colour is ${FN[tf].toLowerCase()}, ${TAGFAM[tag] ? "the feeling it most often comes with" : "today’s feeling, until it has a history"}.</p><div class="tstrip" role="img" aria-label="Days in September with this tag: ${Object.keys(byDay).sort((a, b) => a - b).join(", ")}">${strip}</div><div class="bl-scale2"><span>1 Sep</span><span>30 Sep</span></div></section>
    <section class="panel">${items.length ? items.map(it => `<div class="pitem">${glyphCanvas(it.fam)}<div><b>${it.date}</b><p class="entry">${richText(it.text)}</p></div><span></span></div>`).join("") : `<p class="entry">No entries with this tag yet.</p>`}</section>
  </div>${tabsP()}</div>`;
}
function searchResults(q){
  q = q.trim().toLowerCase(); if (!q) return `<p class="hint">Try chai, R, walk or nostalgic.</p>`;
  const lines = [...ST.kept.filter(e => e.text).map(e => ({date:"Today", text:e.text})), ...PAST, {date:"29 Sep", text:LINE_TAGGED}].filter(e => e.text.toLowerCase().includes(q));
  const tags = TAGS.filter(t => t.includes(q.replace(/^#/, "")));
  const people = PEOPLE.filter(p => p[0].toLowerCase() === q.replace(/^@/, "") || ("friend " + p[0]).toLowerCase().includes(q));
  const feelings = feelingMatches(q, 6);
  const grp = (title, body) => body ? `<div class="sgroup">${h2(title)}${body}</div>` : "";
  const out = grp("Lines", lines.slice(0, 4).map(e => `<div class="sitem"><p class="hint">${e.date}</p><p class="entry">${richText(e.text)}</p></div>`).join(""))
    + grp("Tags", tags.length ? `<div class="tagcloud">${tags.map(t => tagChip(t)).join("")}</div>` : "")
    + grp("People", people.length ? `<div class="faces">${people.map(p => face(p[0])).join("")}</div>` : "")
    + grp("Feelings", feelings.length ? `<div class="chips">${feelings.map(h => `<button type="button" class="chip" data-gloss="${esc(h.w)}" style="--fc:${pal()[h.f]}">${esc(h.w)}</button>`).join("")}</div>` : "");
  return out || `<p class="hint">Nothing matches “${esc(q)}” yet.</p>`;
}
function pSearch(){
  return `<div class="scr">${sbar()}<div class="content scroll">
    <header class="thead row2"><button type="button" class="back" data-go="back" aria-label="Back">${IC.back}</button><h1 class="tdate sm">Search</h1></header>
    <input class="sinput" id="p-search" type="search" placeholder="Lines, #tags, @people, feelings" value="${esc(ST.search)}" aria-label="Search">
    <div class="sres" id="p-results" aria-live="polite">${searchResults(ST.search)}</div>
  </div>${overlays()}${tabsP()}</div>`;
}
/* ---------- the Almanac: it describes the year. The one forecast left is a joke, and only in the Conspiracy theorist’s voice. ---------- */
function reportContent(){
  const counts = monthCounts(), conspiracy = VOICES[ST.voice % VOICES.length][0] === "Conspiracy theorist";
  return `<p class="headline">A warm year, with thunder in May.</p>
    <div class="rep-hero"><canvas data-scene="yradial" data-notes="1" role="img" aria-label="The year so far as a ring, with three stretches marked"></canvas></div>
    <ol class="notes">${YEAR_NOTES.map((nt, k) => `<li><b>${k + 1}</b>${esc(nt.label.replace(" ✦", ""))}</li>`).join("")}</ol>
    <div class="rep-row"><div class="rep-cell"><span class="rn">58</span><span class="rl">feelings named</span><span class="rq">${Object.values(counts).filter(Boolean).length} families this month</span></div><div class="rep-cell"><span class="rn">43</span><span class="rl">hazy days outside</span><span class="rq">31 different feelings named on them</span></div></div>
    <div class="rep-row"><div class="rep-cell"><span class="rn">38</span><span class="rl">places</span><span class="rq">21 were firsts</span></div><div class="rep-cell"><span class="rn">7</span><span class="rl">people</span><span class="rq">R turns up most on Fridays</span></div></div>
    <section class="records">${h2("Notable")}
      <div class="rec"><span class="rn">19</span><p>calm days in March, more than any other month</p></div>
      <div class="rec"><span class="rn">23</span><p>times you named <b>grateful</b>, more than any other word</p></div>
      <div class="rec"><span class="rn">${IC.first}</span><p>the day you marked to keep: <b>21 September</b>, the chai stall on the trip</p></div>
    </section>
    ${conspiracy ? `<div class="rep-fore">${h2("Outlook for October, from the Conspiracy theorist")}<p class="entry">“They say 70% golden hour. Who is ‘they’? Exactly.”</p><p class="hint">A joke. Logbook never predicts how you’ll feel.</p></div>` : ""}`;
}
function almBody(){
  const P = pal(), tab = ST.almTab;
  if (tab === "headlines") return `<section class="panel prompt">${h2("Sunday: this week in a line")}<input class="sinput" id="p-weekline" placeholder="A deadline, then the long walk home." aria-label="This week in a line"><p class="hint">Logbook suggests one from your week if you leave it blank.</p></section>
    <section class="panel">${h2("Weeks")}${WEEKLINES.map(([w, l]) => `<div class="hline"><b>${w}</b><span>${esc(l)}</span></div>`).join("")}</section>
    <section class="panel">${h2("2026 in twelve lines, so far")}${MONTHLINES.map(([m, l], i) => { const f = YEAR[8 - i] ? (YEAR[8 - i].filter(Boolean)[5] || "calm") : "calm"; return `<div class="hline">${glyphCanvas(f)}<div><b>${m}</b><span>${esc(l)}</span></div></div>`; }).join("")}</section>`;
  if (tab === "wrapped") return `<p class="hint">Swipe through. Each card can be saved as a picture.</p><div class="wrapped">
      <div class="wcard" style="background:linear-gradient(160deg, ${P.bright}, ${P.warm}); color:${onColor(mix(P.bright, P.warm, .5))}"><p class="wk">Your September</p><canvas data-scene="form" data-f="bright" aria-hidden="true"></canvas><p class="wbig2">Mostly bright</p><p>15 bright moments, most of them on the trip.</p></div>
      <div class="wcard" style="background:linear-gradient(160deg, ${P.curious}, ${P.low}); color:${onColor(mix(P.curious, P.low, .5))}"><p class="wk">On repeat</p><p class="rn huge">9×</p><p class="wbig2">Kun Faya Kun</p><p>Your song of the week, played most on quiet evenings.</p></div>
      <div class="wcard" style="background:linear-gradient(160deg, ${P.calm}, ${P.curious}); color:${onColor(mix(P.calm, P.curious, .5))}"><p class="wk">Firsts</p><p class="rn huge">6</p><p>A new café, a lake, the best chai of your life, and three more.</p></div>
    </div>`;
  if (tab === "random"){ const r = [["14 March 2026","The first warm evening. Mangoes on the roof with the family.","warm"],["2 July 2026","Rain all day. Finished a whole book in one go.","calm"],["19 January 2026","Cold, slow Sunday. Called R for two hours.","warm"]][ST.randomI % 3];
    return `<section class="panel">${h2("A random day")}<p class="tdate sm">${r[0]}</p><div class="rrow">${formCanvas(r[2])}<p class="entry">${esc(r[1])}</p></div>${btn("Another day", `data-act="random"`, "primary")}</section>
      <section class="panel">${h2("Then and now, 29 September")}<div class="thennow"><div><b>2025</b><span class="photo" style="background:linear-gradient(135deg, ${P.wistful}, ${P.low})"></span><p class="entry">First walk in the monsoon.</p></div><div><b>2026</b><span class="photo" style="background:linear-gradient(135deg, ${P.warm}, ${P.bright})"></span><p class="entry">A new café, and R.</p></div></div></section>`; }
  return reportContent();
}
function pAlmanac(){
  return `<div class="scr">${sbar()}<div class="content scroll"><header class="mast"><h1 class="mast-t">The Almanac</h1><p class="mast-s"><span>No. 1</span><span>2026, so far</span><span>214 days kept</span></p></header>
    <div class="ctabs" role="tablist" aria-label="Almanac">${[["report","Report"],["headlines","Headlines"],["wrapped","Wrapped"],["random","A random day"]].map(([k, l]) => `<button type="button" role="tab" aria-selected="${ST.almTab === k}" class="${ST.almTab === k ? "on" : ""}" data-almtab="${k}">${l}</button>`).join("")}</div>${almBody()}</div>${tabsP()}</div>`;
}
function lifeBody(){
  const P = pal();
  return `<p class="hint">Your life at a glance. A bar under an entry means it lasted a while; “written later” means you added it afterwards.</p><div class="life">${LIFE.map(e => `<div class="lifeitem"><b>${e.y}</b>${glyphCanvas(e.fam)}<div><p class="entry">${esc(e.t)}</p>${e.later ? `<p class="hint">Written later</p>` : ""}${e.span ? `<span class="spanbar wide" style="background:${P[e.fam]}"></span>` : ""}</div></div>`).join("")}</div>${btn(`${IC.plus}Add something from before`, `data-go="form:past"`, "wide")}`;
}
const MONTHNAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
function yearPickSheet(){
  const i = ST.yearPick; if (i == null || i < 0) return "";
  const {mo, d} = dayOfYear(i), f = yearDays()[i], mn = MONTHNAMES[mo], n = yearDays().length;
  const nav = `<div class="btnrow">${i > 0 ? btn(`${IC.back}Day before`, `data-yearstep="-1"`) : ""}${f ? btn("Open this day", `data-go="day"`, "primary") : ""}${i < n - 1 ? btn(`Day after${IC.next}`, `data-yearstep="1"`) : ""}</div>`;
  const head = `<div class="row3"><p class="tdate sm" id="yp-t">${d} ${mn}</p><button type="button" class="iconbtn" data-act="closeyear" aria-label="Close">${IC.close}</button></div>`;
  if (!f) return `<div class="sheet compact" role="dialog" aria-labelledby="yp-t">${head}<p class="entry">Not written yet. This day is still ahead.</p>${nav}</div>`;
  const words = mo === 8 && MONTH[d - 1] ? MONTH[d - 1].words : ATLAS.WORDS[f].map(g => g[1][0][0]).slice(0, 2 + (i % 2));
  const parts = mo === 8 && MONTH[d - 1] ? MONTH[d - 1].parts : words.map(() => f);
  return `<div class="sheet compact" role="dialog" aria-labelledby="yp-t">${head}<div class="yp-row">${glyphCanvas(f)}<p class="entry">Mostly ${FN[f].toLowerCase()}: ${esc(words.join(", then "))}.</p></div>${nav}</div>`;
}
const PSCREENS = {today:pToday, add:pAdd, day:pDay, cal:pCal, person:pPerson, shelves:pShelves, tag:pTag, search:pSearch, almanac:pAlmanac, addsheet:pAddSheet, form:pForm, settings:pSettings, shelf:pShelf};
