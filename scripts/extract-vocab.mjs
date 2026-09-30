import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const src = 'design/pinboard8-source/';
const atlasJs = readFileSync(src + 'atlas-data.js', 'utf8');
const ATLAS = new Function(atlasJs + '; return ATLAS;')();
const out = {
  families: ATLAS.FAM.map(f => ({ id: f.id, holds: f.holds, ladder: f.ladder })),
  // WORDS[family] = [[group, [[word, strength, meaning, about[], close[]], ...]], ...]
  words: ATLAS.WORDS,
  rare: ATLAS.RARE.map(([w, lang, family, meaning]) => ({ w, lang, family, meaning })),
  blends: ATLAS.BLENDS.map(b => ({ name: b.n, a: b.a, b: b.b, meaning: b.m })),
};
const data2 = readFileSync(src + 'p7-data2.js', 'utf8');
const start = data2.indexOf('const raw = `') + 13;
const raw = data2.slice(start, data2.indexOf('`;', start));
const dict = {};
raw.split(';').map(s => s.trim()).filter(Boolean).forEach(row => {
  const [k, f, ws] = row.split('|');
  dict[k.trim()] = { family: f.trim(), words: ws.split(',').map(x => x.trim()) };
});
mkdirSync('src/vocab', { recursive: true });
writeFileSync('src/vocab/atlas.json', JSON.stringify(out));
writeFileSync('src/vocab/dictionary.json', JSON.stringify(dict));
console.log(`families ${out.families.length}, dictionary ${Object.keys(dict).length}`);
