const FAMX = Object.fromEntries(ATLAS.FAM.map(f => [f.id, f]));
const ALLWORDS = [];
FAMS.forEach(f => ATLAS.WORDS[f].forEach(([g, ws]) => ws.forEach(w => ALLWORDS.push({w:w[0], s:w[1], m:w[2], nu:w[3] || [], rel:w[4] || [], f, g}))));
const WORDINDEX = Object.fromEntries(ALLWORDS.map(x => [x.w, x]));
const RAREX = Object.fromEntries(ATLAS.RARE.map(r => [r[0], {w:r[0], lang:r[1], f:r[2], m:r[3], nu:[], rel:[], s:3, g:"From other languages"}]));
const findWord = w => WORDINDEX[w] || RAREX[w] || (ST.custom[w] ? {w, f:ST.custom[w], m:"Your own word.", nu:[], rel:[], s:3, g:"Your words"} : null);
const firstWord = f => ATLAS.WORDS[f][0][1][0][0];
/* Tags take the colour of the feeling they most often come with. A brand-new tag borrows today's overall feeling until it has a history. */
const TAGFAM = {chai:"calm", walk:"warm", metro:"wistful", work:"tense", rain:"wistful", film:"curious", family:"warm", music:"bright", firsts:"bright"};
const tagFam = t => TAGFAM[t] || OVERALL;
/* Marks: First is gold, a new sun. Gift is warm, care between people. Private is calm, because Calm holds feeling safe. Don't bring back is fog: it fades from view. */
const MARKCOL = {first:"bright", gift:"warm", priv:"calm", quiet:"fog"};
/* Round 7: looking back describes what comes together, never what "lifts" or "weighs". Each tag with the two feelings it most often shares a day with. */
const OFTEN = [["walk",["warm","bright"]],["music",["bright","curious"]],["family",["warm","calm"]],["work",["tense","proud"]],["metro",["wistful","calm"]]];
/* People get a colour thread you choose for them. The threads are soft and greyed, so a person never looks like a feeling. */
const PTHREADS = ["#B89A7A","#8FA7B8","#9DAE86","#B395AE","#8DAA9E","#AE9F86","#949FBA","#B49A94"];
const PCOL = {A:0, R:1, J:2, S:3, M:4, N:5, K:6, P:7};
const personCol = w => PTHREADS[(PCOL[w] != null ? PCOL[w] : 0) % PTHREADS.length];
