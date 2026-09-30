function updateSugg(ta){
  const box = document.getElementById("p-sugg"); if (!box) return;
  const before = ta.value.slice(0, ta.selectionStart), m = before.match(/(^|\s)([#@:])([\p{L}\p{N}_'-]*)$/u);
  if (!m){ box.hidden = true; return; }
  const P = pal(), kind = m[2], q = m[3].toLowerCase(); let items = [];
  if (kind === "#"){ items = TAGS.filter(t => t.startsWith(q)).slice(0, 5).map(t => [`#${t}`, "#" + t, P[tagFam(t)], `usually ${FN[tagFam(t)].toLowerCase()}`, "tag"]); if (q && !TAGS.includes(q)) items.push([`Make a new tag, #${q}`, "#" + q, P[OVERALL], "", "tag"]); }
  else if (kind === "@") items = PEOPLE.filter(p => p[0].toLowerCase().startsWith(q)).map(p => [`@${p[0]}, Friend ${p[0]}`, "@" + p[0], personCol(p[0]), "", "person"]);
  else { const hits = q ? feelingMatches(q, 6) : ["calm","content","tired","anxious","grateful","nostalgic"].map(w => ({w, f:findWord(w).f, note:""}));
    items = hits.map(h => [`${h.w}`, ":" + h.w.replace(/ /g, "-"), h.f, `${FN[h.f]}${h.note && h.note.startsWith("means") ? ", " + h.note : ""}`, "feel"]); }
  if (!items.length){ box.hidden = true; return; }
  box.innerHTML = items.map(([label, val, col, note, k]) => `<button type="button" data-sugg="${esc(val)}">${k === "feel" ? glyphCanvas(col, "") : k === "person" ? `<i class="sdot ring" style="--pc:${col}"></i>` : `<i class="sdot" style="background:${col}"></i>`}<span>${esc(label)}${note ? `<small>${esc(note)}</small>` : ""}</span></button>`).join("");
  mountScenes(box); start();
  box.dataset.start = String(before.length - m[3].length - 1); box.hidden = false;
}
/* Keeping a feeling: right now it becomes a moment; for the whole day it sets the day overall. Both can be undone. */
function keepFeeling(another){
  const A = ST.add, x = findWord(A.word); if (!x || (A.q || "").trim()) return;
  if (ST.when === "day"){ const prev = Object.assign({}, ST.overall); ST.overall = {f:A.fam, w:x.w, s:A.s, set:true}; ST.toast = {msg:`The day overall is now ${x.w}.`, undo:{kind:"overall", prev}}; ST.hist = []; ST.screen = "today"; renderProto(); return; }
  const m = {h:23.5, t:"11:30", ap:"pm", f:A.fam, f2:A.f2 || undefined, w:x.w, n:A.nu || "", s:A.s}; MOMENTS.push(m);
  ST.toast = {msg:another ? `Kept ${x.w}. Pick another.` : `Kept ${x.w} in your inner weather.`, undo:{kind:"moment", m}}; ST.fresh = "m" + (MOMENTS.length - 1);
  if (another){ ST.add = Object.assign({}, A, {nu:"", q:"", f2:null, blend:null}); renderProto(); return; }
  ST.hist = []; ST.screen = "today"; renderProto();
}
const resetToday = () => { ST.hist = []; ST.screen = "today"; ST.toast = null; ST.gloss = null; ST.entSheet = null; ST.fresh = null; if (ST.flowVoice){ ST.voice = 0; ST.flowVoice = false; } };
const FLOWS = {
  night:() => { resetToday(); ST.eve = true; ST.more = false; },
  afternoon:() => { resetToday(); ST.eve = false; },
  chip:() => { resetToday(); ST.eve = true; ST.more = false; ST.draft = "Long walk after work, felt :calm and a bit :nostalgic by the end. Pretty :pooped now. "; },
  keep:() => { resetToday(); ST.hist = ["today"]; ST.screen = "add"; ST.when = "now"; ST.add = {fam:"wistful", word:"nostalgic", nu:"", s:3, q:"", f2:null, blend:null}; },
  size:() => { resetToday(); ST.eve = true; },
  cal:() => { resetToday(); ST.screen = "cal"; ST.calTab = "days"; ST.dayOpen = null; ST.yearPick = null; },
  year:() => { resetToday(); ST.screen = "cal"; ST.calTab = "year"; ST.ystyle = "radial"; ST.dayOpen = null; ST.yearPick = 130; },
  back:() => { resetToday(); ST.screen = "cal"; ST.calTab = "emotions"; ST.emo = null; ST.dayOpen = null; ST.yearPick = null; },
  almanac:() => { resetToday(); ST.screen = "almanac"; ST.almTab = "report"; ST.voice = 7; ST.flowVoice = true; },
  add:() => { resetToday(); ST.hist = ["today"]; ST.screen = "addsheet"; }
};
const FORMMEANS = {bright:"rays that swell and settle", proud:"nested peaks, light climbing through them", curious:"an orrery: small worlds on nested orbits", calm:"long, slow, nearly flat waves", warm:"rings that won’t hold still", wistful:"a sun setting over water", low:"lines sagging with weight", tense:"two arms turning round each other", heated:"flames in fine line"};
function formsGrid(){ return `<div class="stage"><div class="flegend">${FAMS.map(f => `<div class="fcell${f === "warm" || f === "tense" ? " fresh" : ""}"><canvas class="big" data-scene="form" data-f="${f}" role="img" aria-label="${FN[f]}: ${FORMMEANS[f]}"></canvas><b>${FN[f]}</b><span>${FORMMEANS[f]}</span></div>`).join("")}</div><p class="setnote">Warm and Tense have swapped drawings, each now in its own family’s colour. Nothing else changed.</p></div>`; }
function smallGrid(){ return `<div class="stage"><div class="smallrow">${FAMS.map(f => `<div class="scell"><canvas class="sm1" data-scene="glyph" data-f="${f}" aria-hidden="true"></canvas><canvas class="sm2" data-scene="glyph" data-f="${f}" aria-hidden="true"></canvas><b>${FN[f]}</b></div>`).join("")}</div><p class="setnote">At calendar size each family becomes a still silhouette. Calm is level, Low sags, Wistful is a sun on the horizon: three different shapes, even in greyscale.</p></div>`; }
const dayPhone = style => `<div class="phone">${dayScreen(style, false)}</div>`;
const fig = (html, cap) => `<figure>${html}<figcaption>${cap}</figcaption></figure>`;
function shareMock(){
  const P = pal();
  return `<div class="phone"><div class="scr fakebg">${sbar()}<div class="content">
    <div class="fakeapp"><div class="fakevid" style="background:linear-gradient(135deg, ${mix(P.low, "#20243a", .5)}, #11131c)" aria-hidden="true"></div><p class="entry">How rivers find their way</p><p class="hint">A video app, before you tap Share</p></div>
  </div>
  <div class="sheet sharesheet"><h2 class="lbl">Keep in Logbook</h2>
    <div class="linkcard"><span class="poster xs" style="background:linear-gradient(160deg, ${P.curious}, ${P.low})"></span><div><b>How rivers find their way</b><span>Video, 18 minutes</span></div></div>
    <p class="subl">Keep it as</p><div class="chips"><span class="chip on ink">Watched</span><span class="chip">A link</span><span class="chip">A quote</span></div>
    <p class="entry sharenote">Made me want to walk by a river.</p>
    <button type="button" class="btn primary big"><span>Keep it</span><small>It lands in today, with the time</small></button></div></div></div>`;
}
function firstRunMock(){
  const p1 = `<div class="phone"><div class="scr fr1">${sbar()}<div class="content"><div class="fr-bloom"><canvas data-scene="form" data-f="warm" data-bloom="1" aria-hidden="true"></canvas></div>
    <p class="fr-voice">“Evening. I’m the Archivist. I keep the small things, so you don’t have to.”</p><p class="entry center">Everything stays on this phone unless you say otherwise.</p><span class="btn primary big fr-go"><span>Begin</span></span></div></div></div>`;
  const steps = [["Your private starter file","Names, homes and birthdays live in a file only you keep.","Choose the file"],["A monthly copy to Google Drive","Markdown and photos, once a month. Optional.","Connect"],["Where you are, once","For place names and the day’s weather. Never tracked in the background.","Allow once"]];
  const p2 = `<div class="phone"><div class="scr">${sbar()}<div class="content"><header class="thead"><h1 class="tdate sm">Three small things</h1><p class="tstamp">Each can wait. Skip any of them.</p></header>
    ${steps.map(([t, d, b], i) => `<section class="panel"><h2 class="fr-t">${t}</h2><p class="entry">${d}</p><div class="btnrow"><span class="btn${i === 0 ? " primary" : ""}">${b}</span><span class="btn ghost">Later</span></div></section>`).join("")}</div></div></div>`;
  const p3 = `<div class="phone"><div class="scr">${sbar()}<div class="content"><header class="thead"><h1 class="tdate sm">Tonight’s first line</h1><p class="voice">“Anything worth keeping from today? One line is plenty.”</p></header>
    <section class="panel"><div class="composer demo"><p class="fakeline">${richText("Moved everything in. :tired but :hopeful. #firsts")}</p></div><p class="hint"># tag · @ person · : feeling</p><span class="btn primary wide">Keep this line</span></section><p class="hint center">The voice can be changed any time in Settings.</p></div></div></div>`;
  return `<div class="branch">${fig(p1, "1. A form blooms, the Archivist speaks")}${fig(p2, "2. Three small things, all skippable")}${fig(p3, "3. The first line, straight away")}</div>`;
}
/* The laptop as a reading room: a real writing column in the middle, big type, the day's page underneath, keyboard shortcuts. */
function laptopMock(){
  const P = pal(), head = ["M","T","W","T","F","S","S"].map(d => `<i>${d}</i>`).join(""), cal = `<span></span>`.repeat(SEP_OFFSET) + MONTH.map(d => d.parts.length ? `<span class="${d.d === 29 ? "today" : ""}">${glyphCanvas(d.overall, "")}<b>${d.d}</b></span>` : `<span class="future"><b>${d.d}</b></span>`).join("");
  return `<div class="laptop-frame"><div class="laptop-inner">
    <aside class="lp-col lp-left"><p class="lp-brand">Logbook</p><div class="lp-search">${IC.search}<span>Search everything</span><kbd>/</kbd></div>
      <nav class="lp-nav"><b>Today</b><span>Calendar</span><span>Shelves</span><span>Almanac</span></nav>
      <h2 class="lbl">September</h2><div class="lp-cal">${head}${cal}</div>
      <h2 class="lbl">Spans</h2>${SPANS.map(s => `<p class="spanline"><i style="background:${P[s.fam]}"></i>${s.name}, ${s.from} to ${s.to}</p>`).join("")}</aside>
    <main class="lp-col lp-mid"><p class="lp-date">Tuesday, 29 September</p><p class="tstamp">${STAMP}</p><p class="voice">${VOICES[0][1]}</p>
      <section class="lp-write"><div class="lp-text">${hlHTML("Long #walk after work with @R. The chai stall by the metro has a new owner, and he got the ginger exactly right. Felt :content most of the way home").trim()}<span class="caret"></span></div>
        <div class="lp-wbar"><span class="hint">Ctrl + Enter keeps it · # tag · @ person · : feeling</span><span class="btn primary">Keep this line</span></div></section>
      <div class="dhero bloomline lp-hero"><canvas data-scene="daybloomline" aria-hidden="true"></canvas></div>
      <p class="daylead">${REPORT}</p>
      <section class="lp-story">${storyItems()}</section></main>
    <aside class="lp-col lp-right">${healthPostcard(false)}<h2 class="lbl">Today’s stamps</h2><div class="stamps one">${STAMPS.slice(0, 4).map(([k, v]) => `<p class="stamp"><b>${k}</b>${esc(v)}</p>`).join("")}</div>
      <h2 class="lbl">Together today</h2><div class="faces">${faces(true)}</div>
      <h2 class="lbl">Keys</h2><dl class="keys"><dt><kbd>/</kbd></dt><dd>search</dd><dt><kbd>N</kbd></dt><dd>write</dd><dt><kbd>←</kbd> <kbd>→</kbd></dt><dd>day before, day after</dd><dt><kbd>G</kbd> <kbd>C</kbd></dt><dd>calendar</dd></dl></aside>
  </div></div>`;
}
/* When something goes wrong: say what happened, that nothing is lost, and the one thing to do. */
function troubleMock(){
  const note = (t, d, b, why) => `<section class="panel trouble"><h2 class="fr-t">${t}</h2><p class="entry">${d}</p><div class="btnrow"><span class="btn primary">${b}</span></div><p class="hint">${why}</p></section>`;
  return `<div class="branch">${fig(`<div class="phone"><div class="scr">${sbar()}<div class="content scroll"><header class="thead"><h1 class="tdate sm">Backup and storage</h1></header>
    ${note("September’s backup didn’t reach Google Drive", "Nothing is lost. Everything is still on this phone.", "Try again now", "Logbook also tries again tonight.")}
    ${note("Google Drive signed you out", "This happens every so often. Backups wait on the phone until you sign in.", "Sign in again", "Only Logbook’s own folder in your Drive is used.")}
    ${note("Your phone is nearly full", "This month’s photos need about 40 MB. Words take almost no space and are always saved first.", "See what’s using space", "Nothing is deleted without asking you.")}
  </div></div></div>`, "Three things that can go wrong, in plain words")}</div>`;
}
/* Who gets colour, now. Every coloured thing also carries a shape, a symbol or a word. */
function coloursDemo(){
  const P = pal(), G = ground(), row = (who, what, sample) => `<div class="crole"><div><b>${who}</b><p>${what}</p></div><div class="crs">${sample}</div></div>`;
  return `<div class="stage croles phoneish">
    ${row("Feelings", "The nine colours are theirs, always with the form and the word.", `<span class="cr-f">${formCanvas("warm")}<span>warm</span></span><span class="cr-f">${formCanvas("tense")}<span>tense</span></span>`)}
    ${row("Tags", "Keep the colour of the feeling they usually come with, as you loved in round 5, with their # and name.", `${tagChip("walk")} ${tagChip("work")}`)}
    ${row("Marks", "Keep their colours, always with their symbol and word.", `${marksMeta({first:true, gift:true})}`)}
    ${row("People", "A soft thread you pick, round their initial. Never a feeling colour, so no friend reads as “low”.", `${faceStatic("K")}${faceStatic("R")}<span class="mention" style="--pc:${personCol("J")}"><b>@</b>J</span>`)}
    ${row("Ratings", "No colour at all: the number and its words.", `<span class="rating">6 of 7 · Exceptional</span>`)}
  </div>`;
}
function contrastDemo(){
  const cell = (fl, f) => { const c0 = FL[fl].c[f], c = solid(c0), t = onColor(c), r = contrast(c, t); return `<span class="ct" style="background:${c}; color:${t}"><b>${FN[f]}</b><i>${r.toFixed(1)}:1${c !== c0 ? ", deepened a touch" : ""}</i></span>`; };
  return `<div class="stage ctwrap">${["luminous","pigment"].map(fl => `<p class="ct-h">${FL[fl].name}</p><div class="ctgrid">${FAMS.map(f => cell(fl, f)).join("")}</div>`).join("")}<p class="setnote">Each chip picks white or dark text by which actually reads better. The number is the contrast; 4.5 or more passes for normal text.</p></div>`;
}
const FEATURES = [
  ["Writing it down", [
    ["One line a day, with room for paragraphs", "Today", "proto"], ["Tags, people and feelings typed into the line", "Today: # @ :", "proto"], ["A feeling in the line opens its card, with Remove", "Today, kept entries", "new"],
    ["Photos and a photo of the day", "Today, and the + button", "proto"], ["Feelings: 242 words, blends, other languages, your own words", "The feeling picker", "proto"], ["Right now vs. the whole day", "The feeling picker", "new"],
    ["Undo after every Keep; change or remove any entry", "Today", "new"], ["Film, book or show, rated 1 to 7, and Currently", "+ button, Shelves", "proto"], ["Quotes and overheard lines", "+ button, Shelves", "proto"],
    ["Places and firsts, on a drawn map", "+ button, Shelves", "proto"], ["People: seen, called or messaged", "+ button, person pages", "proto"], ["Keepsakes and tickets", "+ button, Shelves", "proto"],
    ["Gifts and birthdays", "Marks, Shelves", "proto"], ["Marks: first, gift, private, don’t bring back", "Today", "proto"], ["Voice notes", "+ button", "drawn"],
    ["Spans of days", "+ button, calendar", "proto"], ["Big moments from before, written later", "+ button, Life", "proto"], ["Keeping things shared from other apps", "Share sheet", "drawn"],
    ["Grateful for", "Today", "proto"], ["Song of the week, from Last.fm", "Today, Shelves", "proto"]]],
  ["Stamps, added for you", [
    ["Weather and air outside, on the Indian scale", "Today’s stamps", "proto"], ["Sunrise, sunset and day length", "Today’s stamps", "proto"], ["Moon, special days, distance from home in turns", "Today’s stamps", "proto"],
    ["Days at this home, next trip, where and when it was written", "Today’s stamps", "proto"], ["A postcard from Health, the next afternoon: steps, sleep, workout, check-in, India walk", "Today", "new"], ["Song playing when you wrote", "Today’s stamps", "proto"],
    ["Age, what’s in the sky, compared with normal, on this day in history", "Not drawn yet", "planned"]]],
  ["Looking back", [
    ["The day page", "Bloom (outlined), or Score", "proto"], ["Calendar you can read without colour", "Calendar, Days", "new"], ["Tap or arrow through the year", "Calendar, Year", "new"],
    ["Your life on one page", "Calendar, Life", "proto"], ["On this day, then and now, a random day", "Today, Almanac", "proto"], ["The week in a line on Sundays; a year in twelve lines", "Almanac, Headlines", "proto"],
    ["The report, described and never judged; Wrapped cards", "Almanac", "new"], ["Echoes of earlier days", "The day page", "proto"], ["Search", "Today’s header, everywhere", "proto"], ["Voices and quirky stats", "Settings, Almanac", "proto"]]],
  ["Keeping it safe", [
    ["Monthly backup to Google Drive; export as Markdown and photos", "Settings", "proto"], ["What happens when a backup fails or storage is full", "Drawn this round", "drawn"], ["Lock for private entries", "Settings", "proto"],
    ["Homes, Health, Last.fm, Timeline, Google Photos", "Settings", "proto"], ["A day ends at 4 am; weeks start Monday", "Settings", "proto"], ["Text size follows the phone", "Everywhere", "new"],
    ["First run", "Three screens this round", "drawn"], ["Laptop reading room", "Drawn this round", "drawn"]]],
  ["In the other apps, later", [["A full map, fog of war", "Places app", "later"], ["A deep media diary", "Media app", "later"], ["Quick thoughts, lists and quotes", "Everyday Book", "later"], ["People in depth", "People app, maybe", "later"]]]
];
const STATUS = {proto:"In the prototype", new:"New this round", drawn:"Drawn, not working", planned:"Planned", later:"Another app"};
function featureMap(){ return `<div class="fmap">${FEATURES.map(([g, rows]) => `<div class="fmgroup"><h3>${g}</h3><table><thead><tr><th scope="col">Feature</th><th scope="col">Where</th><th scope="col">Status</th></tr></thead><tbody>${rows.map(([f, w, s]) => `<tr><td>${esc(f)}</td><td>${esc(w)}</td><td><span class="st st-${s}">${STATUS[s]}</span></td></tr>`).join("")}</tbody></table></div>`).join("")}</div>`; }
const DEMOS = {
  "v-lines":formsGrid, "v-small":smallGrid,
  "d-bloomline":() => `<div class="branch">${fig(dayPhone("bloomline"), "Bloom, with an outline")}</div>`,
  "d-score":() => `<div class="branch">${fig(dayPhone("score"), "Score, on one line")}</div>`,
  "c-roles":coloursDemo, "c-contrast":contrastDemo,
  "n-health":() => `<div class="stage hpwrap">${healthPostcard(false)}${healthPostcard(true)}</div>`,
  "n-first":firstRunMock, "n-laptop":laptopMock, "n-trouble":troubleMock, "n-share":() => `<div class="branch">${fig(shareMock(), "Sharing into Logbook from another app")}</div>`, "fm":featureMap
};

/* ---------- sections and cards ---------- */
const TRY = [
  {id:"f-night", flow:"night", title:"Today at 11 pm", steps:["At night Today holds three things: your line, your feelings and the day overall.", "Everything else folds into one “Today so far” row. Tap it to open.", "Search and Settings sit at the top right."]},
  {id:"f-afternoon", flow:"afternoon", title:"Today in the afternoon, with Health’s postcard", steps:["During the day everything is open, in order.", "Yesterday’s postcard from Health arrives in the afternoon, drawn in Health’s own style."]},
  {id:"f-chip", flow:"chip", title:"A feeling in your line opens its card", steps:["Tap on any feeling in the line, like calm, to open its card: what the word means, its family, its strength and close words.", "Remove takes it out of the line. One Backspace also deletes a whole feeling.", "Tap Keep this line: the feelings become one moment, not three, and Undo appears."]},
  {id:"f-keep", flow:"keep", title:"Keeping a feeling", steps:["The Keep button now stays at the bottom and says exactly what it will keep.", "Search for pooped: the button waits until you pick a word, so it can’t keep the wrong one.", "Switch to The whole day to set the day overall instead. Both can be undone."]},
  {id:"f-size", flow:"size", title:"Bigger text", steps:["Use Text size at the top of this page: 130% and 200%.", "Everything in the phone grows with it, the way it will follow your phone’s own setting. At 100% the sizes are now normal app sizes again. Above 100% the tab bar keeps only its icons, drawn bigger, so the labels never collide."]},
  {id:"f-cal", flow:"cal", title:"A calendar you can read without colour", steps:["Each day shows the form of its main feeling, and the key names them.", "Turn on Greyscale at the top: the days still read.", "Tap a day, then move to the day before or after."]},
  {id:"f-year", flow:"year", title:"Tap or arrow through the year", steps:["Tap anywhere near the ring: it picks the nearest day.", "Day before and Day after step through, or click the ring and use the arrow keys."]},
  {id:"f-back", flow:"back", title:"Looking back, described", steps:["“What lifts you, what weighs” is gone. “Often together” shows which feelings share a day with each tag, without ranking.", "Open a person: it says how much time you spent together, never “usually low”."]},
  {id:"f-almanac", flow:"almanac", title:"The Almanac, and its one joke", steps:["The masthead comes first. Records are now “Notable”, with no streaks.", "The forecast only appears in the Conspiracy theorist’s voice, as an obvious joke. Change the voice in Settings and it disappears."]},
  {id:"f-add", flow:"add", title:"The + button", steps:["Feeling, the kind you add most, is the big button at the bottom, nearest your thumb.", "Every other kind sits above it."]}
];
const SECTIONS = [
  {id:"day", title:"The day page", q:"Two styles are left: Bloom, outlined, and Score. You pick one in Settings.", cards:[
    {id:"d-bloomline", title:"Bloom, outlined", insp:"Loved in round 7; now the default", demo:"d-bloomline", text:"Unchanged, apart from the normal text size around it."},
    {id:"d-score", title:"Score, on one line", insp:"Liked in round 7", demo:"d-score", text:"Unchanged."}
  ]},
  {id:"forms", title:"Feeling forms: Lines, final", q:"Lines is the one form set. Fluid is gone.", cards:[
    {id:"v-lines", title:"Lines, with Warm and Tense swapped", insp:"Your note: a one-for-one swap", demo:"v-lines", wide:true, text:"Warm now draws the rings; Tense draws the two arms. Each takes its own family’s colour. The drawings are otherwise untouched."},
    {id:"v-small", title:"Small forms, for calendars and lists", insp:"The critique: Calm, Low and Wistful blurred together when small", demo:"v-small", wide:true, text:"Below about 40 pixels, each family switches to a still silhouette with a clear outline. Try them with Greyscale on."}
  ]},
  {id:"colour", title:"Colour, never on its own", q:"The critique found colour doing five jobs, and white text failing on some colours. Here is who gets colour now.", cards:[
    {id:"c-roles", title:"Who gets colour", insp:"Tags and marks keep what you loved; people and ratings step back", demo:"c-roles", wide:true, text:"Everything coloured also has a shape, a symbol or a word, so it reads in greyscale too."},
    {id:"c-contrast", title:"Text on colour", insp:"The rule that picks white or dark text, fixed", demo:"c-contrast", wide:true, text:"Round 6 switched to white text too early. Now each colour gets whichever reads better."}
  ]},
  {id:"corners", title:"Around the edges", q:"The other things from the critique and your notes.", cards:[
    {id:"n-health", title:"A postcard from Health, with more in it", insp:"Your note: more info, exercise, check-in, fun stuff", demo:"n-health", wide:true, text:"Health’s three rings (workout, sleep, steps), the day’s workout, the check-in, how far along the India walk you are, and one line in Health’s own voice. After 11 pm it switches to Health’s night colours, as Health does."},
    {id:"n-first", title:"The first run", insp:"A form blooms, the Archivist speaks", demo:"n-first", wide:true, text:"Three screens: a welcome, three skippable setup steps, and your first line."},
    {id:"n-laptop", title:"The laptop, as a reading room", insp:"Your note: the main panel needed a thorough rework", demo:"n-laptop", wide:true, text:"A real writing column in the middle with big type, the day’s page under it, and keyboard shortcuts. The calendar and spans sit on the left; Health, stamps and people on the right."},
    {id:"n-trouble", title:"When something goes wrong", insp:"Backup, sign-in, storage", demo:"n-trouble", text:"Each says what happened, that nothing is lost, and the one thing to do."},
    {id:"n-share", title:"Sharing in, fixed", insp:"The text was nearly invisible in light mode", demo:"n-share", text:"The share sheet now follows the light and dark colours properly."}
  ]},
  {id:"map", title:"Everything on the feature list", q:"Where every agreed feature lives now.", cards:[
    {id:"fm", title:"The feature map", insp:"Tell me anything missing", demo:"fm", wide:true, text:"If something you asked for isn’t here, or is in the wrong place, say so in a note."}
  ]}
];
