import type { Entry, Moment, Person } from '../db/types';
import { contrast, mix, onColor, solid } from '../domain/colour';
import { parseDay } from '../domain/day';
import { EMPTY_LOOKUP, entryLine } from '../domain/entryText';
import { wordCounts } from '../domain/looking';
import { FAMILIES, FAMILY_NAME, type Family } from '../vocab/vocab';
import { drawForm, type Look } from './forms';

export type Card = { kind: 'mostly' | 'firsts' | 'words' | 'people'; title: string; big: string; line: string; families: [Family, Family] };
const count = <K,>(xs: K[]) => { const n = new Map<K, number>(); xs.forEach(x => n.set(x, (n.get(x) ?? 0) + 1)); return n; };
const lower = (f: Family) => FAMILY_NAME[f].toLowerCase();
/* The month as a few cards, only where there is something true to say. "Don't bring back" stays out (spec, section 6). */
export function wrappedCards(month: string, entries: Entry[], moments: Moment[], people: Person[] = []): Card[] {
  const quiet = new Set(entries.filter(e => e.marks.quiet).map(e => e.id));
  const es = entries.filter(e => e.day.startsWith(month) && !e.marks.quiet), ms = moments.filter(m => m.day.startsWith(month) && !(m.entryId != null && quiet.has(m.entryId)));
  const n = count(ms.map(m => m.family)), fams = [...FAMILIES].filter(f => n.get(f)).sort((a, b) => n.get(b)! - n.get(a)!), pair = (a: Family): [Family, Family] => [a, fams.find(f => f !== a) ?? a];
  const monthName = parseDay(month + '-01').toLocaleDateString('en-GB', { month: 'long' }), out: Card[] = [];
  if (fams.length) {
    const f = fams[0], days = ms.filter(m => m.family === f).map(m => m.day), tag = [...count(es.filter(e => days.includes(e.day)).flatMap(e => e.tags))].sort((a, b) => b[1] - a[1])[0]?.[0];
    const mid = [...days].sort()[Math.floor(days.length / 2)], part = +mid.slice(8) <= 10 ? 'early in the month' : +mid.slice(8) <= 20 ? 'mid-month' : 'late in the month';
    out.push({ kind: 'mostly', title: `Your ${monthName}`, big: `Mostly ${lower(f)}`, line: `${n.get(f)} ${lower(f)} ${n.get(f) === 1 ? 'moment' : 'moments'}, most of them ${tag ? `on #${tag} days` : part}.`, families: pair(f) });
  }
  const firsts = es.filter(e => e.marks.first);
  if (firsts.length) {
    const names = firsts.slice(0, 3).map(e => entryLine(e, EMPTY_LOOKUP).replace(/\.$/, '')), more = firsts.length - names.length;
    out.push({ kind: 'firsts', title: 'Firsts', big: String(firsts.length), line: `${names.join(', ')}${more ? `, and ${more} more` : ''}.`, families: pair(fams[0] ?? 'bright') });
  }
  const [word] = wordCounts(ms);
  if (word) out.push({ kind: 'words', title: 'Words', big: word[0], line: `Named ${word[1].n} ${word[1].n === 1 ? 'time' : 'times'} this month.`, families: pair(word[1].family) });
  const who = [...count([...new Set(es.flatMap(e => e.people.map(p => `${p}|${e.day}`)))].map(k => k.split('|')[0]))].sort((a, b) => b[1] - a[1])[0];
  if (who) out.push({ kind: 'people', title: 'Together', big: people.find(p => p.initial === who[0])?.name ?? who[0], line: `${who[1]} ${who[1] === 1 ? 'day' : 'days'} together this month.`, families: pair(fams[0] ?? 'warm') });
  return out;
}
/* A card's colours: a gradient between its two families, deepened where needed so its words always read (4.5:1 on both ends). */
export function cardColours(look: Look, [a, b]: [Family, Family]) {
  const text = onColor(solid(mix(look.pal[a], look.pal[b], 0.5)));
  const fit = (c: string) => { let x = c; for (let k = 0; k < 12 && contrast(x, text) < 4.5; k++) x = mix(x, text === '#FFFFFF' ? '#101820' : '#FFFFFF', 0.12); return x; };
  return { from: fit(look.pal[a]), to: fit(look.pal[b]), text };
}
function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  let line = '', yy = y;
  for (const w of text.split(' ')) { const t = line ? `${line} ${w}` : w; if (ctx.measureText(t).width > max && line) { ctx.fillText(line, x, yy); line = w; yy += lh; } else line = t; }
  if (line) ctx.fillText(line, x, yy); return yy + lh;
}
/* The card as a picture, the same words as on screen, for saving. */
export function drawCard(ctx: CanvasRenderingContext2D, look: Look, w: number, h: number, card: Card) {
  const c = cardColours(look, card.families), g = ctx.createLinearGradient(0, 0, w * 0.4, h);
  g.addColorStop(0, c.from); g.addColorStop(1, c.to); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const pad = w * 0.08, s = w / 1080; ctx.fillStyle = c.text; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.font = `700 ${Math.round(44 * s)}px 'Atkinson Hyperlegible', sans-serif`; ctx.fillText(card.title.toUpperCase(), pad, pad);
  drawForm(ctx, look, card.families[0], w - pad - 90 * s, pad + 90 * s, 80 * s, 0);
  ctx.fillStyle = c.text; ctx.font = `800 ${Math.round((card.big.length > 12 ? 96 : 150) * s)}px 'Archivo', 'Atkinson Hyperlegible', sans-serif`;
  const y = wrap(ctx, card.big, pad, h * 0.34, w - 2 * pad, (card.big.length > 12 ? 110 : 165) * s);
  ctx.font = `400 ${Math.round(52 * s)}px 'Atkinson Hyperlegible', sans-serif`; wrap(ctx, card.line, pad, y + 30 * s, w - 2 * pad, 70 * s);
  ctx.font = `700 ${Math.round(34 * s)}px 'Atkinson Hyperlegible', sans-serif`; ctx.fillText('Logbook', pad, h - pad - 34 * s);
}
export async function cardPng(card: Card, look: Look): Promise<Blob> {
  const c = new OffscreenCanvas(1080, 1350); drawCard(c.getContext('2d') as unknown as CanvasRenderingContext2D, look, 1080, 1350, card);
  return c.convertToBlob({ type: 'image/png' });
}
