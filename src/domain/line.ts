import { feelingOf, type Family } from '../vocab/vocab';

export interface Token { kind: 'tag' | 'person' | 'feeling'; raw: string; value: string; start: number; end: number }
export interface MomentDraft { word: string; family: Family; second?: Family; about?: string; strength: number }
/* # tags, @ people, and : feelings, each only at the start of a word (so emails, C#, issue#12 and 5:30 don't count). A person is kept by initial. */
const TOKEN_RE = /((?<=^|\s)#[\p{L}\p{N}_-]+)|((?<=^|\s)@[A-Za-z]+)|((?<=^|\s):[\p{L}][\p{L}'-]*)/gu;

export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  for (const m of text.matchAll(TOKEN_RE)) {
    const raw = m[0], start = m.index ?? 0, end = start + raw.length;
    if (m[1]) out.push({ kind: 'tag', raw, value: raw.slice(1).toLowerCase(), start, end });
    else if (m[2]) out.push({ kind: 'person', raw, value: raw.slice(1, 2).toUpperCase(), start, end });
    else out.push({ kind: 'feeling', raw, value: raw.slice(1).toLowerCase().replace(/-/g, ' '), start, end });
  }
  return out;
}
export const tokenAt = (text: string, pos: number) => tokenize(text).find(t => pos > t.start && pos <= t.end) ?? null;
const uniq = <T,>(xs: T[]) => [...new Set(xs)];
export const tagsOf = (text: string) => uniq(tokenize(text).filter(t => t.kind === 'tag').map(t => t.value));
export const peopleOf = (text: string) => uniq(tokenize(text).filter(t => t.kind === 'person').map(t => t.value));
export function feelingsOf(text: string, own: Record<string, Family>): { w: string; family: Family }[] {
  const seen = new Set<string>(), out: { w: string; family: Family }[] = [];
  tokenize(text).filter(t => t.kind === 'feeling').forEach(t => { const x = feelingOf(t.value, own); if (x && !seen.has(x.w)) { seen.add(x.w); out.push(x); } });
  return out;
}
/* Several feelings in one line become ONE moment: the first word leads, a second family rides along, the rest are listed. */
export function momentFromLine(found: { w: string; family: Family }[], recentWords: Set<string>): { moment: MomentDraft | null; skipped: string[] } {
  const skipped = found.filter(x => recentWords.has(x.w)).map(x => x.w);
  const fresh = found.filter(x => !recentWords.has(x.w));
  if (!fresh.length) return { moment: null, skipped };
  const lead = fresh[0], second = fresh.find(x => x.family !== lead.family)?.family, rest = fresh.slice(1).map(x => x.w);
  const moment: MomentDraft = { word: lead.w, family: lead.family, strength: 3 };
  if (second) moment.second = second;
  if (rest.length) moment.about = 'then ' + rest.join(', ');
  return { moment, skipped };
}
export function removeFeelingToken(text: string, word: string): string {
  const t = tokenize(text).find(x => x.kind === 'feeling' && x.value === word.toLowerCase());
  if (!t) return text;
  return (text.slice(0, t.start) + text.slice(t.end)).replace(/\s+([,.;!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}

/* Undoing a removal from the draft: only when nothing was typed since; otherwise leave the words alone (Undo never deletes writing). */
export function restoreDraft({ before, after, current }: { before: string; after: string; current: string }): string | null { return current === after ? before : null; }
