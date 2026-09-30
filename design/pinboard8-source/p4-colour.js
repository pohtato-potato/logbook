/* ---------- colour system: the nine feeling colours, unchanged since round 3. Round 7 adds text rules on top. ---------- */
const FL = {
  luminous:{name:"Luminous", c:{bright:"#FFC83D", proud:"#FF9142", curious:"#9C8CFF", calm:"#56D6B8", warm:"#FF8FAE", wistful:"#B795CB", low:"#6F9BE8", tense:"#C9D84A", heated:"#FF5F57", fog:"#A9B4C2", smog:"#C98A5E"}},
  pigment:{name:"Pigment", c:{bright:"#E9A23B", proud:"#D9692E", curious:"#6A5AA8", calm:"#5C9E8C", warm:"#D9777F", wistful:"#947393", low:"#4F6FA8", tense:"#A2A43F", heated:"#C4432F", fog:"#8A94A3", smog:"#9A5B3C"}}
};
const FAMS = ["bright","proud","curious","calm","warm","wistful","low","tense","heated"];
const FN = {bright:"Bright", proud:"Proud", curious:"Curious", calm:"Calm", warm:"Warm", wistful:"Wistful", low:"Low", tense:"Tense", heated:"Heated"};
const FAMNOTE = {bright:"joy, fun, hope", proud:"achievement, confidence", curious:"interest, wonder, surprise", calm:"peace, relief, rest", warm:"love, gratitude, closeness", wistful:"part glad, part sad", low:"sadness, loss, flat days", tense:"worry, fear, pressure", heated:"anger, frustration"};
const LADDER = {bright:["Pale sun","Sunny","Bright sun","Dazzling","Blazing"], proud:["Light breeze","Steady wind","Tailwind","Strong tailwind","Full sail"], curious:["Clear night","First stars","Starry","Milky Way","Aurora"], calm:["Soft breeze","Still air","Clear morning","Glassy water","Perfect stillness"], warm:["Soft light","Warm light","Golden hour","Sunset glow","Deep gold"], wistful:["Mist","Drizzle","Soft rain at dusk","Steady rain","Long rain"], low:["Overcast","Light rain","Rain","Downpour","Deluge"], tense:["Close air","Muggy","Thunder nearby","Storm overhead","Lightning storm"], heated:["Warm wind","Hot wind","Heatwave","Dust storm","Thunderstorm"]};
const WORDS = {
  bright:[["joyful","Happiness that fills you right up.",["with people","on my own","at something beautiful"]],["excited","Buzzing about something coming.",["about a plan","about someone","nervous-excited"]],["hopeful","Expecting something good.",["about a plan","about someone","cautiously"]],["amused","Something tickled you.",["by something absurd","at myself"]],["free","Unburdened; nothing holding you back.",["from a weight","on holiday"]]],
  proud:[["proud","You did something worth doing.",["of myself","of someone","quietly"]],["accomplished","Finished something that mattered.",["finally","against the odds"]],["confident","Trusting yourself right now.",["at work","with people"]],["brave","Did it even though it scared you.",["said the hard thing","tried something new"]],["determined","Set on it; not giving up.",["after a setback","about a goal"]]],
  curious:[["curious","Wanting to know more.",["about a person","about an idea","about a place"]],["fascinated","Deeply pulled in.",["by a subject","by a person"]],["absorbed","Lost in it; time disappeared.",["in work","in a book, film or game"]],["awed","Feeling small before something vast.",["by nature","by art or music"]],["inspired","Sparked; wanting to make something.",["by someone","by something I saw"]]],
  calm:[["calm","Steady; nothing pulling at you.",["at home","outdoors"]],["content","Enough; not wanting more.",["with little","with where I am"]],["relieved","A weight just lifted.",["it’s over","it went well"]],["peaceful","Quiet inside and out.",["in nature","after a bath"]],["cosy","Snug, warm and tucked in.",["indoors while it rains","with someone"]]],
  warm:[["close","Near someone, in sync.",["to a friend","to family","to a partner"]],["grateful","Thankful for what you have or were given.",["for someone","for something","for today"]],["loving","Deep care for someone.",["a friend","family","myself"]],["touched","Someone’s kindness reached you.",["by a gesture","by words"]],["understood","Someone truly got you.",["by a friend","by family"]]],
  wistful:[["nostalgic","Warmly missing a past time, place or person.",["for a place","for a person","for a time"]],["melancholy","A lingering, reflective sadness that can feel almost sweet.",["sweet","heavy","from a song"]],["sombre","Grave and serious; the light has gone quiet.",["reflective","after serious news"]],["bittersweet","Glad and sad about the same thing.",["an ending","a goodbye","growing up"]],["longing","Wanting someone or something far away.",["for a person","for a place"]]],
  low:[["sad","Something hurts or is missing.",["about someone","no idea why"]],["lonely","Wanting connection you don’t have.",["missing someone","left out","alone in a crowd"]],["drained","Emptied out.",["by work","by people"]],["disappointed","It didn’t turn out as hoped.",["in someone","in myself"]],["numb","Feelings switched off.",["after something big","just flat"]]],
  tense:[["anxious","Uneasy about what might happen.",["about the future","about people","no idea why"]],["worried","Your mind circling a specific problem.",["about someone","about work"]],["overwhelmed","More than you can hold right now.",["too much to do","too many feelings"]],["nervous","Jittery before something.",["before an event","around someone"]],["restless","Can’t settle, in body or mind.",["in body","in mind"]]],
  heated:[["frustrated","Blocked from what you want.",["at myself","at someone","at things not working"]],["irritated","Small things grating on you.",["by noise","by people"]],["angry","Something wrong was done.",["at someone","at the world"]],["resentful","An old hurt still burning.",["at someone","at a situation"]],["fed up","You’ve had enough.",["with work","with everything"]]]
};

const reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
let flav = "luminous", bg = "dark", motion = reduceMotion ? "still" : "gentle", formset = "lines", tsize = 1, grey = false;
try { const saved = JSON.parse(localStorage.getItem("logbook-pinboard8-view") || "null"); if (saved){ flav = FL[saved.flav] ? saved.flav : flav; bg = saved.bg === "light" ? "light" : saved.bg === "dark" ? "dark" : bg; motion = saved.motion || motion; tsize = [1, 1.3, 2].includes(saved.tsize) ? saved.tsize : 1; grey = !!saved.grey; } } catch(e){}

const hexToRgb = h => { h = h.replace("#", ""); return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]; };
const rgba = (h, a) => { const [r,g,b] = hexToRgb(h); return `rgba(${r},${g},${b},${a})`; };
const mix = (h1, h2, t) => { const a = hexToRgb(h1), b = hexToRgb(h2); return "#" + a.map((v, i) => Math.round(v + (b[i]-v)*t).toString(16).padStart(2, "0")).join(""); };
const lum = h => { const [r,g,b] = hexToRgb(h).map(v => { v /= 255; return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4); }); return .2126*r + .7152*g + .0722*b; };
/* WCAG contrast between two colours */
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
/* Text on a coloured fill: whichever of white or near-black actually reads better. (Round 6 switched to white too early.) */
const onColor = h => contrast(h, "#FFFFFF") >= contrast(h, "#101820") ? "#FFFFFF" : "#101820";
/* A few mid-tones (Pigment wistful) reach 4.5:1 with neither; when text sits on them, the fill deepens a touch until it does. */
function solid(c){ let out = c, k = 0; while (Math.max(contrast(out, "#FFFFFF"), contrast(out, "#101820")) < 4.5 && k < 1){ k += .04; out = mix(c, "#101820", k); } return out; }
const fillVars = c => { const s = solid(c); return `--fc:${c}; --ff:${s}; --fo:${onColor(s)}`; };
/* A colour used AS text: nudged darker on light grounds and lighter on dark ones until it reaches 4.5:1 */
function inkOf(c, base){ const G = ground(), b = base || G.base, to = G.dark ? "#FFFFFF" : "#101820"; let k = 0, out = c; while (contrast(out, b) < 4.5 && k < 1){ k += .05; out = mix(c, to, k); } return out; }
const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
function pal(){ const c = FL[flav].c; if (bg === "dark" && flav === "pigment"){ const o = {}; for (const k in c) o[k] = mix(c[k], "#FFFFFF", .16); return o; } return c; }
function ground(){
  return bg === "dark"
    ? {base:"#0F1317", ink:"#EEF2F5", card:"rgba(22,28,35,.74)", solid:"#182028", muted:"rgba(238,242,245,.8)", rule:"rgba(238,242,245,.14)", line:"rgba(238,242,245,.46)", tag:"rgba(238,242,245,.14)", scrim:"rgba(15,19,23,.8)", dark:true}
    : {base:"#F2F4F3", ink:"#13171C", card:"rgba(255,255,255,.84)", solid:"#FFFFFF", muted:"rgba(19,23,28,.76)", rule:"rgba(19,23,28,.12)", line:"rgba(19,23,28,.52)", tag:"rgba(19,23,28,.08)", scrim:"rgba(246,247,246,.86)", dark:false};
}
function prng(seed){ let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
