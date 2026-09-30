/* ---------- example data (made up) ---------- */
const DAY = [
  {h:9.17, t:"9:10", ap:"am", f:"tense", w:"anxious", n:"about work", s:3},
  {h:13.5, t:"1:30", ap:"pm", f:"bright", f2:"tense", w:"hopeful", n:"but nervous", s:3},
  {h:18.67, t:"6:40", ap:"pm", f:"warm", w:"close", n:"to friends", s:3},
  {h:23.33, t:"11:20", ap:"pm", f:"wistful", w:"nostalgic", n:"for a place", s:3}
];
let MOMENTS = DAY.map(m => Object.assign({}, m));
const OVERALL = "warm";
const MONTH = (() => {
  const rnd = prng(20260901), out = [];
  for (let d = 1; d <= 30; d++){
    if (d === 30){ out.push({d, parts:[], overall:null, photo:false, people:0, first:false}); continue; }
    let pool = ["bright","calm","warm","warm","curious","proud","wistful","low","tense","calm","bright","calm"];
    if (d >= 7 && d <= 11) pool = ["tense","tense","low","heated","calm","tense"];
    if (d >= 17 && d <= 21) pool = ["bright","curious","warm","bright","curious","proud"];
    if (d >= 24 && d <= 26) pool = ["wistful","low","wistful","calm"];
    const n = 2 + Math.floor(rnd() * 3);
    const parts = Array.from({length:n}, () => pool[Math.floor(rnd() * pool.length)]);
    out.push({d, parts, overall:parts[Math.floor(n/2)], photo:rnd() < .55, people:Math.floor(rnd() * 3), first:rnd() < .12});
  }
  out[28] = {d:29, parts:["tense","bright","warm","wistful"], overall:"warm", photo:true, people:2, first:true};
  return out;
})();
const WPICK = [0,0,0,1,1,2,3,4]; /* people lean on a few favourite words */
MONTH.forEach(day => { day.words = day.parts.map((f, i) => WORDS[f][WPICK[(day.d * 3 + i * 5) % 8]][0]); });
MONTH[28].words = ["anxious","hopeful","close","nostalgic"];
const SEP_OFFSET = 1; /* 1 September 2026 is a Tuesday; weeks start on Monday */
const SPANS = [{name:"Busy week", from:7, to:11, fam:"tense"}, {name:"Trip", from:17, to:21, fam:"curious"}];
const LENS = [31,28,31,30,31,30,31,31,30,31,30,31];
/* Moods come in runs, so the example year does too: each day usually repeats yesterday, and the month's season sets the odds. */
const YEAR = (() => {
  const rnd = prng(99);
  const bias = [["low","calm","warm","tense"],["calm","warm","bright","low"],["bright","curious","warm","calm"],["tense","bright","calm","proud"],["tense","heated","tense","low"],["wistful","low","calm","warm"],["warm","bright","wistful","calm"],["calm","curious","warm","bright"]];
  let cur = "calm";
  return LENS.map((len, m) => Array.from({length:len}, (_, d) => {
    if (m === 8){ const day = MONTH[d]; return day && day.parts.length ? day.overall : null; }
    if (m > 8) return null;
    if (rnd() > .68){ const pool = bias[m].concat(bias[m], ["calm","warm","bright","curious","proud","wistful","low","tense","heated"]); cur = pool[Math.floor(rnd() * pool.length)]; }
    return cur;
  }));
})();
const INTENSITY = (() => { const rnd = prng(7), out = []; let v = .5; YEAR.forEach(m => m.forEach(f => { v = Math.max(0, Math.min(1, v + (rnd() - .5) * .45)); out.push(f ? v : 0); })); return out; })();
const PEOPLE = [["A",3,41,"warm"],["R",1,28,"bright"],["J",1,35,"calm"],["S",6,22,"curious"],["M",12,19,"proud"],["N",20,11,"wistful"],["K",30,8,"low"],["P",9,14,"tense"]];
const TAGS = ["chai","walk","metro","work","rain","film","family","music","firsts"];
const PAST = [
  {date:"27 Sep", text:"Rain all evening. Made #chai and finally finished the #film.", tags:["chai","film"], fam:"calm"},
  {date:"21 Sep", text:"Trip, day five. The best #chai of my life at a roadside stall.", tags:["chai"], fam:"bright", marks:{first:true}},
  {date:"14 Sep", text:"Long #walk with @R after work; we talked about everything.", tags:["walk"], fam:"warm"},
  {date:"9 Sep", text:"Deadline week. Surviving on #chai and cold toast. #work", tags:["chai","work"], fam:"tense"},
  {date:"2 Sep", text:"First #rain of the month; the #metro smelled of wet umbrellas.", tags:["rain","metro"], fam:"wistful"}
];
const PERSONLOG = [
  {m:"September", date:"26 Sep", title:"Dinner at a new café", mood:"warm", kind:"event", photo:true, first:true},
  {m:"September", date:"14 Sep", title:"Long walk after work", mood:"warm", kind:"event"},
  {m:"September", date:"9 Sep", title:"A late call in deadline week", mood:"tense", kind:"mood"},
  {m:"August", date:"21 Aug", title:"Their birthday: you gave a book", mood:"bright", kind:"event", gift:true},
  {m:"August", date:"3 Aug", title:"Monsoon walk, soaked through", mood:"curious", kind:"photo", photo:true},
  {m:"July", date:"12 Jul", title:"Quiet evening, a film at home", mood:"calm", kind:"mood"}
];
const LINE_TAGGED = "Long #walk after work with @R. The #chai stall by the #metro has a new owner, and he got the ginger exactly right.";
const STAMP = "Outside: haze, 31° · air 212, poor · sunset 6:04 pm";
const REPORT = "Thundery through the morning, breaks in the cloud by lunch, golden with friends in the evening, a little dusk before bed.";
function monthCounts(){ const c = {}; FAMS.forEach(f => { c[f] = 0; }); MONTH.forEach(d => d.parts.forEach(f => { c[f]++; })); return c; }
function wordCounts(){ const c = {}; MONTH.forEach(d => d.words.forEach((w, i) => { const k = w; c[k] = c[k] || {n:0, f:d.parts[i]}; c[k].n++; })); return Object.entries(c).sort((a, b) => b[1].n - a[1].n); }
