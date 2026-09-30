
/* ---------- a much bigger everyday dictionary: slang, British, American, Hinglish and literary words, each pointing at the family and the Atlas words it means ---------- */
const SYN2 = (() => {
  const raw = `
mid|low|bored,disappointed;meh|low|listless,apathetic,bored;blah|low|listless,down;bleh|low|listless,down;ugh|heated|annoyed,exasperated;oof|low|disappointed,awkward;argh|heated|frustrated;sigh|low|tired,discouraged;yay|bright|glad,happy;woohoo|bright|excited,elated;lol|bright|amused;lmao|bright|amused;dead|bright|amused;ded|bright|amused;dying|bright|amused;sending me|bright|amused;crying laughing|bright|amused;
lit|bright|excited,thrilled;fire|bright|excited;hyped|bright|excited,eager;hype|bright|excited;pumped|bright|excited,eager;psyched|bright|excited;jazzed|bright|excited;stoked|bright|excited,thrilled;buzzing|bright|excited,thrilled;slay|proud|confident,triumphant;slaying|proud|confident,triumphant;ate|proud|triumphant,proud;goated|proud|proud,confident;main character|proud|confident,bold;delulu|bright|hopeful,optimistic;
vibing|calm|mellow,content;chill|calm|relaxed,mellow;chilling|calm|relaxed,mellow;zen|calm|serene,calm;jomo|calm|content,at ease;touching grass|calm|grounded,present;wholesome|warm|touched,fond;soft|warm|tender,affectionate;in my feels|wistful|sentimental,melancholy;in my feelings|wistful|sentimental,melancholy;simping|warm|smitten,adoring;crushing|warm|smitten;heart eyes|warm|smitten,adoring;down bad|warm|smitten,longing;
pressed|heated|irritated,defensive;triggered|heated|defensive,shaken;salty|heated|bitter,resentful;sus|tense|suspicious;shook|tense|shaken,shocked;spooked|tense|scared;cringe|tense|embarrassed,awkward;ick|heated|repulsed,disgusted;the ick|heated|repulsed,disgusted;overstimulated|tense|overwhelmed,frazzled;fomo|tense|left out,anxious;doomscrolling|tense|anxious,restless;hangxiety|tense|anxious,regretful;imposter syndrome|tense|inadequate,insecure;existential|tense|lost,uncertain;
burnt|low|burnt out,exhausted;burned out|low|burnt out,exhausted;fried|low|burnt out,exhausted;cooked|low|burnt out,drained;dead inside|low|numb,empty;brain fog|low|listless,detached;not okay|low|down,hurt;touch starved|low|lonely;running on empty|low|drained,exhausted;in a funk|low|down,listless;falling apart|low|fragile,overwhelmed;
knackered|low|exhausted,tired;shattered|low|exhausted,heartbroken;cream crackered|low|exhausted;pooped|low|exhausted,tired;beat|low|exhausted;wiped|low|exhausted,drained;wiped out|low|exhausted,drained;bushed|low|exhausted;zonked|low|exhausted;dog tired|low|exhausted;weary|low|tired,drained;lethargic|low|listless,tired;sluggish|low|listless,tired;torpid|low|listless;
chuffed|bright|pleased,delighted;chuffed to bits|bright|delighted;made up|bright|delighted,glad;over the moon|bright|elated,thrilled;on cloud nine|bright|elated,euphoric;walking on air|bright|elated;on top of the world|bright|elated,triumphant;tickled|bright|amused,delighted;tickled pink|bright|delighted;chipper|bright|cheerful;jaunty|bright|cheerful,carefree;blithe|bright|carefree;gleeful|bright|delighted,playful;jubilant|bright|elated,triumphant;exuberant|bright|exhilarated,lively;ecstatic|bright|euphoric,elated;rapturous|bright|euphoric;buoyant|bright|cheerful,optimistic;sanguine|bright|optimistic,hopeful;good|bright|happy,pleased;great|bright|delighted,happy;amazing|bright|elated,delighted;awesome|bright|delighted;wonderful|bright|joyful;fantastic|bright|delighted;blessed|warm|grateful;lucky|bright|lucky;
gutted|low|devastated,disappointed;bummed|low|disappointed,down;crestfallen|low|disappointed,discouraged;despondent|low|hopeless,discouraged;dejected|low|discouraged,down;forlorn|low|lonely,sad;woebegone|low|sorrowful;doleful|low|sorrowful;lugubrious|low|sorrowful;morose|low|down,sad;lachrymose|low|sad;disconsolate|low|heartbroken,sorrowful;desolate|low|isolated,hopeless;down in the dumps|low|down,sad;under the weather|low|tired,down;pants|low|down;rubbish|low|down;bad|low|down,unhappy;terrible|low|unhappy,sorrowful;awful|low|unhappy,sorrowful;horrible|low|unhappy;upset|low|hurt,unhappy;mopey|low|down;teary|low|sad;weepy|low|sad;hollow|low|empty,numb;blasé|low|apathetic;blase|low|apathetic;idle|low|listless,bored;lazy|low|unmotivated,listless;sick|low|drained,fragile;unwell|low|drained,fragile;ill|low|drained,fragile;heavy|low|sorrowful,drained;flat|low|listless,numb,down;low|low|down,sad;
miffed|heated|annoyed,offended;narked|heated|irritated;narky|heated|irritated;cheesed off|heated|fed up,annoyed;brassed off|heated|fed up;hacked off|heated|annoyed;ticked off|heated|annoyed,angry;peeved|heated|annoyed;steamed|heated|angry;bent out of shape|heated|offended,annoyed;in a strop|heated|sulky;stroppy|heated|grumpy;mardy|heated|grumpy,sulky;cranky|heated|grumpy;moody|heated|grumpy,irritated;snappy|heated|irritated;touchy|heated|defensive;vexed|heated|annoyed,frustrated;irked|heated|irritated;irate|heated|furious;livid|heated|furious;incensed|heated|outraged;aggrieved|heated|resentful,offended;rancorous|heated|bitter,resentful;spiteful|heated|bitter;petulant|heated|sulky;sullen|heated|sulky;sulking|heated|sulky;disgruntled|heated|fed up,annoyed;jaded|heated|cynical,disillusioned;over it|heated|fed up;done|heated|fed up,exhausted;pissed|heated|angry,furious;mad|heated|angry;fired up|proud|motivated,determined;worked up|tense|stressed,anxious;grossed out|heated|disgusted;
freaked out|tense|panicked,scared;freaking out|tense|panicked,overwhelmed;creeped out|tense|uneasy;on edge|tense|nervous,restless;jittery|tense|nervous,restless;jumpy|tense|nervous;antsy|tense|restless,impatient;keyed up|tense|restless,nervous;nervy|tense|nervous;panicky|tense|panicked;paranoid|tense|suspicious,anxious;wound up|tense|stressed,restless;wired|tense|restless,anxious;all over the place|tense|unsettled,frazzled;a mess|tense|frazzled,overwhelmed;hot mess|tense|frazzled,overwhelmed;at my wits end|tense|frazzled,overwhelmed;at a loss|tense|lost,confused;out of sorts|tense|unsettled,down;a bit off|tense|uneasy,down;chagrined|tense|embarrassed,ashamed;mortified|tense|embarrassed,humiliated;sheepish|tense|embarrassed,awkward;abashed|tense|embarrassed;flustered|tense|frazzled,embarrassed;rattled|tense|shaken;perturbed|tense|unsettled,worried;disquieted|tense|uneasy;fretful|tense|worried;trepidatious|tense|apprehensive;aghast|tense|shocked;flummoxed|tense|confused,puzzled;befuddled|tense|confused;bewildered|tense|confused,lost;overthinking|tense|preoccupied,anxious;sunday scaries|tense|dread;butterflies|tense|nervous,smitten,excited;stressed out|tense|stressed,frazzled;
agog|curious|intrigued,fascinated,eager;rapt|curious|absorbed,captivated;gobsmacked|curious|astonished,stunned;dumbfounded|curious|stunned,astonished;awestruck|curious|awed,in wonder;spellbound|curious|enchanted,captivated;enraptured|curious|captivated;inquisitive|curious|curious,interested;wide eyed|curious|in wonder,amazed;nonplussed|curious|puzzled,confused;bemused|curious|puzzled;in the zone|curious|absorbed,focused;piqued|curious|intrigued,offended;
placid|calm|calm,still;tranquil|calm|peaceful,serene;halcyon|calm|peaceful,nostalgic;equanimous|calm|balanced;sated|calm|content;replete|calm|content;languid|calm|unhurried,listless;at peace|calm|peaceful;fine|calm|at ease;okay|calm|balanced;ok|calm|balanced;alright|calm|at ease;neutral|calm|balanced;cozy|calm|cosy;snug|calm|cosy;
enamoured|warm|smitten;enamored|warm|smitten;besotted|warm|smitten,adoring;infatuated|warm|smitten;lovesick|warm|longing,smitten;doting|warm|adoring,caring;beholden|warm|grateful;thankful|warm|grateful;loved|warm|appreciated,connected;cared for|warm|appreciated,safe;choked up|warm|moved,touched;needy|low|lonely,vulnerable;clingy|low|vulnerable,lonely;
pining|wistful|longing,missing someone;missing|wistful|missing someone;miss|wistful|missing someone,longing;elegiac|wistful|melancholy,sombre;plaintive|wistful|melancholy;musing|wistful|reflective,contemplative;brooding|wistful|pensive,preoccupied;melancholic|wistful|melancholy;heartsick|low|heartbroken,longing;happy sad|wistful|bittersweet;homesick|wistful|homesick;
smug|proud|self-assured,vindicated;cocky|proud|confident,bold;self satisfied|proud|satisfied;dauntless|proud|brave;intrepid|proud|brave,bold;plucky|proud|brave;gung ho|proud|motivated,eager;driven|proud|motivated,ambitious;zealous|proud|determined,motivated;steadfast|proud|determined,resilient;fulfilled|proud|satisfied,content;validated|proud|vindicated,respected;on top of things|proud|capable,confident;holding up|proud|resilient;
tension|tense|worried,stressed,anxious;tensed|tense|stressed,anxious;mood off|heated|down,irritated,grumpy;timepass|low|bored;bore ho raha|low|bored;khush|bright|happy;bahut khush|bright|delighted;udaas|low|sad,down;pareshaan|tense|worried,frazzled;ghabrahat|tense|anxious,nervous;ghabraya|tense|anxious,nervous;gussa|heated|angry;chidchida|heated|irritated,grumpy;thaka hua|low|tired,exhausted;thak gaya|low|tired,exhausted;dil bhar aaya|warm|moved,touched;mazaa aaya|bright|delighted,amused;josh|proud|motivated,excited;dar lag raha|tense|scared,afraid;akela|low|lonely;sharminda|tense|embarrassed,ashamed;fida|warm|smitten;bindaas|bright|carefree,free;load|tense|stressed,pressured;frustu|heated|frustrated;senti|wistful|sentimental;emotional|warm|moved,sentimental;dimaag kharab|heated|irritated,fed up;
hungry|heated|hangry;hangry|heated|hangry`;
  const out = {};
  raw.split(";").map(s => s.trim()).filter(Boolean).forEach(row => { const [k, f, ws] = row.split("|"); out[k.trim()] = {f:f.trim(), ws:ws.split(",").map(x => x.trim())}; });
  return out;
})();
/* Every searchable term: the 242 words, the words from other languages, the dictionary above and the person's own words. Close typos still match. */
function editDistance(a, b){ if (Math.abs(a.length - b.length) > 2) return 9; const d = Array.from({length:a.length + 1}, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1)); return d[a.length][b.length]; }
function feelingMatches(q, limit){
  q = q.trim().toLowerCase().replace(/[-_]/g, " "); if (!q) return [];
  const res = [], seen = new Set(), add = (w, f, note, kind) => { if (seen.has(w + "|" + kind)) return; seen.add(w + "|" + kind); res.push({w, f, note, kind}); };
  Object.entries(ST.custom).forEach(([w, f]) => { if (w.includes(q)) add(w, f, "your own word", "own"); });
  ALLWORDS.filter(x => x.w.includes(q)).sort((a, b) => a.w.indexOf(q) - b.w.indexOf(q) || a.w.length - b.w.length).forEach(x => add(x.w, x.f, x.m, "atlas"));
  Object.entries(SYN2).filter(([k]) => k.includes(q) || k.replace(/ /g, "") === q.replace(/ /g, "")).forEach(([k, v]) => add(k, v.f, "means " + v.ws.filter(w => findWord(w)).join(", "), "slang"));
  ATLAS.RARE.filter(r => r[0].includes(q)).forEach(r => add(r[0], r[2], `${r[1]}: ${r[3]}`, "rare"));
  if (res.length < 3 && q.length >= 4){
    const near = [...ALLWORDS.map(x => [x.w, x.f, x.m, "atlas"]), ...Object.entries(SYN2).map(([k, v]) => [k, v.f, "means " + v.ws.join(", "), "slang"])].map(r => [editDistance(q, r[0]), r]).filter(([d, r]) => d <= (q.length >= 7 ? 2 : 1)).sort((a, b) => a[0] - b[0]);
    near.slice(0, 3).forEach(([d, r]) => add(r[0], r[1], "did you mean this? " + r[2], r[3]));
  }
  return res.slice(0, limit || 8);
}

/* ---------- the rest of the feature list, as example data ---------- */
const VOICES = [
  ["Archivist", "“Evening. Anything worth keeping from today?”"],
  ["Friend", "“Hey you. How was today, really?”"],
  ["Gremlin", "“Feed me a memory. A small one. I’m not picky.”"],
  ["Ship’s captain", "“Log entry, 23:24. Rough seas by morning, calm by dusk. Report, sailor.”"],
  ["Nature documentary", "“And here, as dusk settles, the human returns to its burrow to reflect.”"],
  ["Noir detective", "“The day had a secret. They always do. Spill it.”"],
  ["Time traveller", "“Future you asked me to collect this one. What happened?”"],
  ["Conspiracy theorist", "“They don’t want you writing this down. Write it down.”"]
];
const STAMPS = [["Outside","Haze, 31°"],["Air outside","212, poor (India scale)"],["Sun","rise 6:08, set 6:04"],["Day length","11 h 56 m, a minute shorter"],["Moon","waning, 88% lit"],["Today is","World Heart Day"],["From home","12 km from Home 2"],["At this home","412 days"],["Playing","Kun Faya Kun"],["Next trip","in 23 days"],["Written","on your phone, 11:24 pm"]];
const SEW = [[1,"Complete garbage"],[2,"Terrible"],[3,"Bad"],[4,"Average"],[5,"Good, recommended"],[6,"Exceptional"],[7,"Masterpiece"]];
const MEDIA = [
  {kind:"Film", title:"Past Lives", r:6, line:"Quietly wrecked me.", date:"27 Sep", fam:"wistful"},
  {kind:"Book", title:"The Remains of the Day", r:7, line:"A whole life in the gaps between sentences.", date:"20 Sep", fam:"wistful", current:true, note:"reading, page 142"},
  {kind:"Series", title:"Panchayat", r:5, line:"Gentle, funny, very close to home.", date:"12 Sep", fam:"warm"},
  {kind:"Game", title:"Firewatch", r:6, line:"The colours alone.", date:"3 Sep", fam:"curious"},
  {kind:"Album", title:"Random Access Memories", r:5, line:"Still good on a long walk.", date:"28 Aug", fam:"bright"}
];
const QUOTES = [
  {q:"Chai tastes better when someone else makes it.", who:"R", where:"the stall by the metro", date:"14 Sep"},
  {q:"We’re not lost, we’re just early for somewhere else.", who:"overheard", where:"on the trip", date:"19 Sep"},
  {q:"Write it down or it didn’t happen.", who:"J", where:"a late call", date:"9 Sep"}
];
const PLACES = [
  {name:"The chai stall by the metro", fam:"calm", x:.34, y:.58, visits:23},
  {name:"A new café by the metro", fam:"warm", x:.4, y:.52, first:true, visits:1},
  {name:"The long walk loop", fam:"warm", x:.22, y:.4, visits:9},
  {name:"Roadside stall on the trip", fam:"bright", x:.8, y:.2, first:true, visits:1},
  {name:"The lake at the top", fam:"curious", x:.86, y:.3, first:true, visits:1},
  {name:"Home 2", fam:"calm", x:.3, y:.66, home:true, visits:0}
];
const KEEPS = [
  {what:"Film ticket, Past Lives", date:"27 Sep", fam:"wistful"},
  {what:"Pressed flower from the trip", date:"19 Sep", fam:"curious"},
  {what:"A note from J", date:"2 Sep", fam:"warm"},
  {what:"Wristband from the concert", date:"23 Aug", fam:"bright"}
];
const BDAYS = [
  {who:"A", fam:"warm", when:"11 Oct", in:"in 12 days", gifts:["2025: a book of poems (they loved it)", "2024: a plant, still alive"]},
  {who:"S", fam:"curious", when:"2 Nov", in:"in 34 days", gifts:["2025: concert tickets"]},
  {who:"R", fam:"bright", when:"21 Aug", in:"passed", gifts:["2026: you gave a book", "2025: dinner out"]}
];
const SONGS = [["This week","Kun Faya Kun","A. R. Rahman"],["Week 38","Ilahi","Pritam"],["Week 37","Bloom","The Paper Kites"],["Week 36","Agar Tum Saath Ho","A. R. Rahman"]];
const WEEKLINES = [["Week 39","A deadline, then the long walk home."],["Week 38","The trip: chai stalls and mountain air."],["Week 37","Quiet. Mostly work, a good film."],["Week 36","First rain of the month."]];
const MONTHLINES = [["September","Busy, then gone: a trip, and a quiet end."],["August","Monsoon walks and a birthday."],["July","The long rains; stayed in a lot."],["June","Heat, and a new habit that stuck."],["May","Deadline season. Survived it."],["April","Spring plans, half of them kept."],["March","The first warm evenings."],["February","Short and kind."],["January","A slow start, a good one."]];
const LIFE = [
  {y:"2026", t:"The trip to the mountains", fam:"curious", span:true},
  {y:"2025", t:"Moved to Home 2", fam:"calm"},
  {y:"2024", t:"First job", fam:"proud", later:true},
  {y:"2023", t:"A hard year, and getting through it", fam:"low", later:true, span:true},
  {y:"2022", t:"Graduated", fam:"bright", later:true},
  {y:"2019", t:"Moved to Home 1", fam:"warm", later:true}
];
const ADDKINDS = [["feeling","Feeling","How you feel, now or for the day"],["photo","Photo","From your gallery"],["media","Film, book or show","With a 1–7 rating"],["quote","Quote","Said to you, or overheard"],["place","Place","Firsts light up the map"],["person","Person","Seen, called or messaged"],["keep","Keepsake","A ticket, a note, a thing"],["voice","Voice note","Say it instead"],["span","Span","A trip or a stretch of days"],["past","Something from before","Backdate a big moment"]];
