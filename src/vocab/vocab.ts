import atlas from './atlas.json';
import dict from './dictionary.json';

export type Family = 'bright' | 'proud' | 'curious' | 'calm' | 'warm' | 'wistful' | 'low' | 'tense' | 'heated';
export const FAMILIES: Family[] = ['bright', 'proud', 'curious', 'calm', 'warm', 'wistful', 'low', 'tense', 'heated'];
export const FAMILY_NAME: Record<Family, string> = { bright: 'Bright', proud: 'Proud', curious: 'Curious', calm: 'Calm', warm: 'Warm', wistful: 'Wistful', low: 'Low', tense: 'Tense', heated: 'Heated' };
export interface Word { w: string; family: Family; group: string; s: number; meaning: string; about: string[]; close: string[]; lang?: string }
export interface Blend { name: string; a: Family; b: Family; meaning: string }
export interface Match { w: string; family: Family; note: string; kind: 'own' | 'atlas' | 'slang' | 'rare' | 'near' }

type RawWord = [string, number, string, string[]?, string[]?];
const A = atlas as unknown as { families: { id: Family; holds: string; ladder: [string, string][] }[]; words: Record<Family, [string, RawWord[]][]>; rare: { w: string; lang: string; family: Family; meaning: string }[]; blends: Blend[] };
const D = dict as Record<string, { family: Family; words: string[] }>;

export const FAMILY_INFO = Object.fromEntries(A.families.map(f => [f.id, { holds: f.holds, ladder: f.ladder }])) as Record<Family, { holds: string; ladder: [string, string][] }>;
export const ALL_WORDS: Word[] = FAMILIES.flatMap(family => A.words[family].flatMap(([group, ws]) => ws.map(([w, s, meaning, about, close]) => ({ w, family, group, s, meaning, about: about ?? [], close: close ?? [] }))));
export const RARE_WORDS: Word[] = A.rare.map(r => ({ w: r.w, family: r.family, group: 'From other languages', s: 3, meaning: r.meaning, about: [], close: [], lang: r.lang }));
export const BLENDS: Blend[] = A.blends;
const INDEX = new Map(ALL_WORDS.map(w => [w.w, w]));
const RARE = new Map(RARE_WORDS.map(w => [w.w, w]));

export function groupsOf(f: Family): { group: string; words: Word[] }[] {
  return A.words[f].map(([group]) => ({ group, words: ALL_WORDS.filter(w => w.family === f && w.group === group) }));
}
const norm = (s: string) => s.trim().toLowerCase().replace(/[-_]/g, ' ');
export function findWord(w: string, own: Record<string, Family>): Word | null {
  const k = norm(w);
  return INDEX.get(k) ?? RARE.get(k) ?? (own[k] ? { w: k, family: own[k], group: 'Your words', s: 3, meaning: 'Your own word.', about: [], close: [] } : null);
}
export function feelingOf(token: string, own: Record<string, Family>): { w: string; family: Family } | null {
  const k = norm(token), x = findWord(k, own);
  if (x) return { w: k, family: x.family };
  if (D[k]) return { w: k, family: D[k].family };
  return null;
}
export function slangTargets(term: string): string[] {
  return (D[norm(term)]?.words ?? []).filter(w => INDEX.has(w));
}
export function ladderName(f: Family, strength: number): string {
  const s = Math.max(1, Math.min(5, Math.round(strength || 3)));
  return FAMILY_INFO[f].ladder[s - 1][1];
}
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
/* Own words first, then the 242, then everyday words, then words from other languages; close typos only when little else matched. */
export function searchFeelings(q: string, own: Record<string, Family>, limit = 8): Match[] {
  q = norm(q);
  if (!q) return [];
  const res: Match[] = [], seen = new Set<string>();
  const add = (m: Match) => { if (!seen.has(m.w)) { seen.add(m.w); res.push(m); } }; // each word once: the first (most specific) kind wins
  Object.entries(own).forEach(([w, family]) => { if (w.includes(q)) add({ w, family, note: 'your own word', kind: 'own' }); });
  ALL_WORDS.filter(x => x.w.includes(q)).sort((a, b) => a.w.indexOf(q) - b.w.indexOf(q) || a.w.length - b.w.length).forEach(x => add({ w: x.w, family: x.family, note: x.meaning, kind: 'atlas' }));
  Object.entries(D).filter(([k]) => k.includes(q) || k.replace(/ /g, '') === q.replace(/ /g, '')).forEach(([k, v]) => add({ w: k, family: v.family, note: 'means ' + slangTargets(k).join(', '), kind: 'slang' }));
  RARE_WORDS.filter(r => r.w.includes(q)).forEach(r => add({ w: r.w, family: r.family, note: `${r.lang}: ${r.meaning}`, kind: 'rare' }));
  if (res.length < 3 && q.length >= 4) {
    const pool: Match[] = [...ALL_WORDS.map(x => ({ w: x.w, family: x.family, note: x.meaning, kind: 'near' as const })), ...Object.entries(D).map(([k, v]) => ({ w: k, family: v.family, note: 'means ' + v.words.join(', '), kind: 'near' as const }))];
    pool.map(m => [editDistance(q, m.w), m] as const).filter(([d]) => d <= (q.length >= 7 ? 2 : 1)).sort((a, b) => a[0] - b[0]).slice(0, 3)
      .forEach(([, m]) => add({ ...m, note: 'did you mean this? ' + m.note }));
  }
  return res.slice(0, limit);
}
