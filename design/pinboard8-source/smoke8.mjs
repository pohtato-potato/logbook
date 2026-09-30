import { readFileSync } from 'node:fs';
const html = readFileSync(process.argv[2], 'utf8');
const js = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
const grad = { addColorStop(o, c){ if (!(o >= 0 && o <= 1)) throw new Error('bad colour stop offset ' + o); if (/NaN|undefined/.test(String(c))) throw new Error('bad colour stop ' + c); } };
const mkctx = () => new Proxy({}, {
  has: () => true,
  get(t, k){
    if (k in t) return t[k];
    if (k === 'createLinearGradient' || k === 'createRadialGradient') return (...a) => { for (const v of a) if (!Number.isFinite(v)) throw new Error('non-finite gradient arg'); return grad; };
    if (k === 'createPattern') return () => ({});
    if (k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
    if (k === 'arc') return (x, y, r, ...rest) => { for (const v of [x, y, r, ...rest]) if (typeof v === 'number' && !Number.isFinite(v)) throw new Error('non-finite arc'); if (r < 0) throw new Error('negative radius ' + r); };
    if (k === 'ellipse') return (x, y, rx, ry, ...rest) => { for (const v of [x, y, rx, ry, ...rest]) if (typeof v === 'number' && !Number.isFinite(v)) throw new Error('non-finite ellipse'); if (rx < 0 || ry < 0) throw new Error('negative ellipse radius'); };
    return (...a) => { for (const v of a) if (typeof v === 'number' && !Number.isFinite(v)) throw new Error('non-finite argument to ' + String(k)); };
  },
  set(t, k, v){ if (typeof v === 'string' && /NaN|undefined/.test(v)) throw new Error('bad value for ' + String(k) + ': ' + v); t[k] = v; return true; }
});
const el = () => ({ innerHTML:'', textContent:'', style:{ setProperty(){}, width:'' }, classList:{ toggle(){ return false; }, contains(){ return false; } }, click(){}, disabled:false, outerHTML:'', dataset:{}, setAttribute(){}, appendChild(){}, querySelector(){ return el(); }, querySelectorAll(){ return []; }, addEventListener(){}, focus(){}, select(){}, hidden:false, value:'', checked:false, parentElement:{ querySelector(){ return el(); } } });
globalThis.window = globalThis; globalThis.matchMedia = () => ({ matches:false });
globalThis.localStorage = { getItem(){ return null; }, setItem(){} };
const host = el();
globalThis.document = { documentElement:{ style:{ setProperty(){} } }, body:{ classList:{ toggle(){} } }, hidden:false, activeElement:null,
  createElement: () => ({ width:0, height:0, getContext: () => mkctx() }), getElementById: id => id === 'proto-screen' ? host : el(), querySelectorAll: () => [], querySelector: () => el(), addEventListener(){}, fonts:null };
globalThis.requestAnimationFrame = () => 0; globalThis.addEventListener = () => {}; globalThis.devicePixelRatio = 2;
const api = new Function(js + '\n;return {SCENES, DEMOS, ITEMS, SECTIONS, TRY, FLOWS, ST, PSCREENS, hlHTML, richText, searchResults, feelingResults, feelingMatches, feelingOf, saveLine, keepFeeling, keepForm, dayScreen, reportContent, reactionsText, go, yearHit, yearGeom, ALLWORDS, WORDINDEX, RAREX, ATLAS, FAMS, SYN2, findWord, mixOk, undo, glossRemove, protoAct, onColor, contrast, inkOf, solid, FL, pal, ground, MOMENTS:()=>MOMENTS, setView:(f,b,m,s)=>{flav=f;bg=b;motion=m;tsize=s;}};')();
const problems = [], bad = s => /undefined|NaN|\[object Object\]/.test(s), used = new Set();
const scan = (label, out) => { if (typeof out !== 'string' || !out.length) problems.push(label + ': empty'); else { if (bad(out)) problems.push(label + ': contains undefined/NaN: ' + (out.match(/.{40}(undefined|NaN|\[object Object\]).{20}/) || [''])[0]); for (const m of out.matchAll(/data-scene="([a-z]+)"/g)) used.add(m[1]); } };
const F = api.FAMS, ST = api.ST;
const argsFor = {
  form:[...F.map(f => ({f})), {f:'bright', f2:'tense'}, ...F.map(f => ({f, scale:'.4'})), {f:'warm', bloom:'1'}, {}], glyph:[...F.map(f => ({f})), {}],
  bloomcell:[{parts:'tense,calm,warm'},{parts:'bright'},{parts:''}], bloomday:[{parts:'tense,bright,warm,wistful'},{parts:''}],
  yradial:[{},{mini:'1'},{notes:'1'}], 
};
for (const f of ['luminous','pigment']) for (const b of ['light','dark']) for (const set of [1, 2]) {
  api.setView(f, b, 'gentle', set);
  for (const [name, def] of Object.entries(api.SCENES)) {
    for (const args of (argsFor[name] || [{}])) for (const t of [0, 2.3, 57]) for (const [w, h] of [[320, 240], [48, 48], [276, 360]]) {
      try { def.fn(mkctx(), w, h, t, { args:Object.assign({}, args), pat:null, sel:null }); } catch(e){ problems.push(`${name} ${f}/${b}/${set} ${JSON.stringify(args)} t=${t} ${w}x${h}: ${e.message}`); }
    }
  }
  for (const [name, fn] of Object.entries(api.DEMOS)) { try { scan(`demo ${name} ${f}/${b}`, fn()); } catch(e){ problems.push(`demo ${name} ${f}/${b}: ${e.message}`); } }
  const newForm = k => { ST.form = k; ST.fm = {kind:"Film", r:5, who:"Overheard", fam:"bright", who2:[], how:"In person", photo:null, current:false}; };
  const states = [
    () => {}, () => { ST.draft = 'Long #walk with @R and @Z, :calm then :pooped and :notaword at 5:30. #chai <b>bold</b> & "quotes"'; ST.marks = {first:true, priv:true, quiet:true, gift:true}; },
    () => { ST.photos = [{g:['#9fb3c8','#4d5b73'], sugg:0}, {url:'blob:x'}]; ST.potd = 1; ST.stampsOpen = true; ST.voice = 5; ST.songKept = true; ST.grateful = 'rain'; },
    () => { ST.kept = [{type:'media', kind:'Film', title:'X', r:4, line:'ok', current:true}, {type:'quote', q:'hi', who:'R', where:''}, {type:'place', name:'P', first:true}, {type:'keep', what:'t', photo:null}, {type:'span', name:'s', from:'2026-01-01', to:'2026-01-02', fam:'calm'}, {type:'past', date:'2020-01-01', text:'x'}, {type:'person', who:['A','R'], how:'Call'}, {type:'voice'}, {time:'1', text:'#a :calm', tags:['a'], marks:{}}]; },
    () => { ST.calTab = 'days'; ST.dayOpen = 29; }, () => { ST.calTab = 'gallery'; }, () => { ST.calTab = 'year'; ST.ystyle = 'pixels'; ST.yearPick = 3; }, () => { ST.calTab = 'year'; ST.ystyle = 'radial'; ST.yearPick = 300; }, () => { ST.yearPick = 271; }, () => { ST.yearPick = 364; },
    () => { ST.calTab = 'life'; ST.yearPick = null; }, () => { ST.calTab = 'emotions'; ST.emo = {kind:'fam', key:'tense'}; }, () => { ST.emo = {kind:'word', key:'nostalgic'}; },
    ...['media','quote','place','keep','span','past','voice','person','photo'].map(k => () => newForm(k)),
    () => { ST.fm.r = 1; ST.fm.who2 = ['A','K']; ST.fm.photo = {url:'blob:y'}; }, () => { ST.fm.r = 7; },
    ...['firsts','media','quotes','places','keeps','bdays','songs','spans'].map(k => () => { ST.shelf = k; }),
    ...['report','headlines','wrapped','random'].map(k => () => { ST.almTab = k; }), () => { ST.randomI = 7; },
    ...['bloomline','score'].map(k => () => { ST.dayStyle = k; }),
    () => { ST.eve = false; }, () => { ST.eve = true; ST.more = true; }, () => { ST.more = false; ST.when = 'day'; }, () => { ST.gloss = {w:'nostalgic', src:'draft', start:0, end:10}; }, () => { ST.gloss = {w:'pooped', src:'m:0'}; }, () => { ST.gloss = {w:'mid', src:null}; }, () => { ST.gloss = null; ST.toast = {msg:'Kept <b>', undo:{kind:'entry', id:1}}; ST.entSheet = null; }, () => { ST.toast = null; ST.voice = 7; }, () => { ST.voice = 0; ST.yearPick = 0; ST.calTab = 'year'; }, () => { ST.yearPick = null; ST.calTab = 'days'; },
    () => { ST.custom = {mid:'low', 'my word':'warm'}; ST.add = {fam:'low', word:'mid', nu:'', s:2, q:'', f2:null, blend:null}; }, () => { ST.add.q = 'pooped'; }, () => { ST.add.q = 'zzzqqq'; }, () => { ST.add.q = '<img>'; },
    ...F.map(fam => () => { ST.add = {fam, word:api.ATLAS.WORDS[fam][0][1][0][0], nu:'', s:5, q:'', f2:null, blend:null}; })
  ];
  for (const st of states) { st(); for (const [scr, fn] of Object.entries(api.PSCREENS)) { try { scan(`screen ${scr} ${f}/${b}/${set} form=${ST.form} shelf=${ST.shelf} alm=${ST.almTab} day=${ST.dayStyle} cal=${ST.calTab}`, fn()); } catch(e){ problems.push(`screen ${scr} ${f}/${b} form=${ST.form} shelf=${ST.shelf} alm=${ST.almTab} cal=${ST.calTab}: ${e.message}`); } } }
  ST.custom = {}; ST.photos = []; ST.kept = []; ST.potd = null;
}
// dictionary coverage
for (const w of ['mid','pooped','agog','knackered','udaas','lugubrious','knackerd','agogg','meh','mood off','hangry']) { const r = api.feelingMatches(w, 5); if (!r.length) problems.push('dictionary has nothing for ' + w); }
const missingTargets = Object.entries(api.SYN2).flatMap(([k, v]) => v.ws.filter(w => !api.findWord(w)).map(w => k + '→' + w));
if (missingTargets.length) problems.push('dictionary targets not in the Atlas: ' + missingTargets.join(', '));
if (Object.keys(api.SYN2).length < 250) problems.push('dictionary is small: ' + Object.keys(api.SYN2).length);
// colour mixing stays vivid
const m = api.mixOk(['#FF8FAE', '#FFC83D'], [1, 1]); if (!/^#[0-9a-f]{6}$/.test(m)) problems.push('mixOk returned ' + m);
// actions
try {
  api.setView('luminous', 'dark', 'gentle', 'lines');
  for (const [k, fn] of Object.entries(api.FLOWS)) { fn(); const out = api.PSCREENS[ST.screen](); if (bad(out)) problems.push('flow ' + k + ' bad'); }
  ST.screen = 'today'; ST.draft = 'Felt :calm, then :pooped. #bakery with @J'; const before = api.MOMENTS().length; api.saveLine();
  if (api.MOMENTS().length !== before + 1) problems.push('feelings typed into the line should make one merged moment, made: ' + (api.MOMENTS().length - before));
  const mm = api.MOMENTS()[api.MOMENTS().length - 1]; if (!mm || mm.w !== 'calm' || !/pooped/.test(mm.n)) problems.push('merged moment wrong: ' + JSON.stringify(mm));
  ST.draft = 'Again :calm'; const b2 = api.MOMENTS().length; api.saveLine(); if (api.MOMENTS().length !== b2) problems.push('a feeling logged in the last hour was logged twice');
  api.undo(); if (ST.kept.some(e => e.text === 'Again :calm')) problems.push('undo did not remove the kept line'); if (ST.draft !== 'Again :calm') problems.push('undo did not put the words back: ' + ST.draft);
  ST.draft = ''; ST.gloss = {w:'calm', src:'kept:' + ST.kept[0].id}; api.glossRemove(); if (/:calm/.test(ST.kept[0].text)) problems.push('glossRemove left the word in the entry: ' + ST.kept[0].text); if (api.MOMENTS().some(m => m.src === ST.kept[0].id && m.w === 'calm')) problems.push('glossRemove left the moment');
  api.undo(); if (!/:calm/.test(ST.kept[0].text)) problems.push('undo after remove did not restore the entry');
  ST.draft = 'hi :calm and more'; ST.gloss = {w:'calm', src:'draft', start:3, end:8}; api.glossRemove(); if (ST.draft !== 'hi and more') problems.push('removing from the draft gave: ' + JSON.stringify(ST.draft)); ST.draft = '';
  ST.add = {fam:'low', word:'exhausted', nu:'', s:3, q:'pooped', f2:null, blend:null}; const b3 = api.MOMENTS().length; api.keepFeeling(false); if (api.MOMENTS().length !== b3) problems.push('picker kept a word while search was open');
  ST.add.q = ''; ST.when = 'day'; api.keepFeeling(false); if (ST.overall.w !== 'exhausted' || !ST.overall.set) problems.push('whole day did not set the day overall'); api.undo(); if (ST.overall.w === 'exhausted') problems.push('undo did not restore the day overall'); ST.when = 'now';
  ST.kept = [];
  for (const k of ['media','quote','place','keep','span','past','person']) { api.go('form:' + k); api.keepForm(); }
  if (ST.kept.filter(e => e.type).length !== 7) problems.push('keepForm did not keep every kind: ' + ST.kept.map(e => e.type).join(','));
  scan('today after keeps', api.PSCREENS.today());
  const g = api.yearGeom(320, 320), a0 = g.angOf(0), hit = api.yearHit(g.cx + Math.cos(a0) * (g.R0 + 10), g.cy + Math.sin(a0) * (g.R0 + 10), 320, 320);
  if (hit !== 0) problems.push('tapping the start of the year ring gave day ' + hit);
  const a1 = g.angOf(200), hit2 = api.yearHit(g.cx + Math.cos(a1) * (g.R0 + 10), g.cy + Math.sin(a1) * (g.R0 + 10), 320, 320); if (hit2 !== 200) problems.push('tapping day 200 gave ' + hit2);
  api.go('feel:pooped'); if (ST.screen !== 'add' || ST.add.fam !== 'low') problems.push('feel link failed: ' + ST.add.fam);
  scan('reactionsText', api.reactionsText());
} catch(e){ problems.push('actions: ' + e.message + '\n' + e.stack); }
const missing = Object.values(api.ITEMS).filter(c => c.demo && !api.DEMOS[c.demo]).map(c => c.id); if (missing.length) problems.push('cards with unknown demo: ' + missing.join(','));
const unknown = [...used].filter(s => !api.SCENES[s]); if (unknown.length) problems.push('unknown scenes used: ' + unknown.join(','));
const unusedScenes = Object.keys(api.SCENES).filter(s => !used.has(s)); if (unusedScenes.length) problems.push('scenes never used: ' + unusedScenes.join(','));
const flowsMissing = api.TRY.filter(c => !api.FLOWS[c.flow]).map(c => c.id); if (flowsMissing.length) problems.push('flows missing: ' + flowsMissing.join(','));
for (const fl of ['luminous','pigment']) for (const f of F){ const c = api.solid(api.FL[fl].c[f]), r = api.contrast(c, api.onColor(c)); if (r < 4.5) problems.push(`text on ${fl} ${f} only ${r.toFixed(2)}:1`); }
for (const b of ['light','dark']) { api.setView('pigment', b, 'gentle', 1); for (const f of F){ const r = api.contrast(api.inkOf(api.pal()[f]), api.ground().base); if (r < 4.5) problems.push(`ink of ${f} on ${b} only ${r.toFixed(2)}:1`); } }
console.log(`cards ${Object.keys(api.ITEMS).length} | sections ${api.SECTIONS.length} | scenes ${Object.keys(api.SCENES).length} | demos ${Object.keys(api.DEMOS).length} | screens ${Object.keys(api.PSCREENS).length} | dictionary ${Object.keys(api.SYN2).length}`);
console.log(problems.length ? 'PROBLEMS (' + problems.length + '):\n' + [...new Set(problems)].slice(0, 30).join('\n') : 'No problems: every scene, screen, flow and form set rendered in all palette/background combinations.');
