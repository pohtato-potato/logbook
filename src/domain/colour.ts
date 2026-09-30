import type { Family } from '../vocab/vocab';

export type Theme = 'dark' | 'light';
type Pal = Record<Family | 'fog', string>;
export const LUMINOUS: Pal = { bright: '#FFC83D', proud: '#FF9142', curious: '#9C8CFF', calm: '#56D6B8', warm: '#FF8FAE', wistful: '#B795CB', low: '#6F9BE8', tense: '#C9D84A', heated: '#FF5F57', fog: '#A9B4C2' };
export const PIGMENT: Pal = { bright: '#E9A23B', proud: '#D9692E', curious: '#6A5AA8', calm: '#5C9E8C', warm: '#D9777F', wistful: '#947393', low: '#4F6FA8', tense: '#A2A43F', heated: '#C4432F', fog: '#8A94A3' };
export const palette = (t: Theme): Pal => (t === 'dark' ? LUMINOUS : PIGMENT);
export const GROUND = {
  dark: { base: '#0F1317', ink: '#EEF2F5', card: 'rgba(22,28,35,.74)', solid: '#182028', muted: 'rgba(238,242,245,.8)', rule: 'rgba(238,242,245,.14)', line: 'rgba(238,242,245,.46)', tag: 'rgba(238,242,245,.14)', scrim: 'rgba(15,19,23,.8)' },
  light: { base: '#F2F4F3', ink: '#13171C', card: 'rgba(255,255,255,.84)', solid: '#FFFFFF', muted: 'rgba(19,23,28,.76)', rule: 'rgba(19,23,28,.12)', line: 'rgba(19,23,28,.52)', tag: 'rgba(19,23,28,.08)', scrim: 'rgba(246,247,246,.86)' },
} as const;
export const MARK_FAMILY = { first: 'bright', gift: 'warm', priv: 'calm', quiet: 'fog' } as const;
/* People get a soft, greyed thread colour, so a person never looks like a feeling. */
export const PERSON_THREADS = ['#B89A7A', '#8FA7B8', '#9DAE86', '#B395AE', '#8DAA9E', '#AE9F86', '#949FBA', '#B49A94'];

const hexToRgb = (h: string) => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
export const mix = (a: string, b: string, t: number) => { const x = hexToRgb(a), y = hexToRgb(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const lum = (h: string) => { const [r, g, b] = hexToRgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrast = (a: string, b: string) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
/* Text on a coloured fill: whichever of white or near-black actually reads better. */
export const onColor = (c: string) => (contrast(c, '#FFFFFF') >= contrast(c, '#101820') ? '#FFFFFF' : '#101820');
/* A few mid-tones reach 4.5:1 with neither; when text sits on them the fill deepens a touch until it does. */
export function solid(c: string): string { let out = mix(c, c, 0), k = 0; while (Math.max(contrast(out, '#FFFFFF'), contrast(out, '#101820')) < 4.5 && k < 1) { k += 0.04; out = mix(c, '#101820', k); } return out; }
/* A colour used AS text: nudged towards the ink until it reaches 4.5:1 on the ground. */
export function inkOf(c: string, base: string, dark: boolean): string { const to = dark ? '#FFFFFF' : '#101820'; let out = c, k = 0; while (contrast(out, base) < 4.5 && k < 1) { k += 0.05; out = mix(c, to, k); } return out; }
/* Tags take the colour of the feeling they most often share a day with; a new tag borrows today's. */
export function tagFamily(tag: string, history: Record<string, Family[]>, today: Family): Family {
  const seen = history[tag]; if (!seen || !seen.length) return today;
  const n = new Map<Family, number>(); seen.forEach(f => n.set(f, (n.get(f) ?? 0) + 1));
  return [...n.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
/* OKLab mixing that keeps chroma, so pink and yellow meet in coral, not grey. Ported from design/pinboard8-source/p7-scenes2.js. */
const srgb2lin = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lin2srgb = (c: number) => { const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(0, c), 1 / 2.4) - 0.055; return Math.round(Math.max(0, Math.min(1, v)) * 255); };
function toOklab(hex: string): [number, number, number] { const [r, g, b] = hexToRgb(hex).map(srgb2lin), l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]; }
function fromOklab([L, A, B]: [number, number, number]): string { const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3), m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3), s = Math.pow(L - 0.0894841775 * A - 1.291485548 * B, 3);
  return '#' + [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map(v => lin2srgb(v).toString(16).padStart(2, '0')).join(''); }
export function mixOk(cols: string[], weights: number[]): string {
  let L = 0, A = 0, B = 0, C = 0, W = 0;
  cols.forEach((c, i) => { const [l, a, b] = toOklab(c), w = weights[i]; L += l * w; A += a * w; B += b * w; C += Math.hypot(a, b) * w; W += w; });
  L /= W; A /= W; B /= W; C /= W; const h = Math.atan2(B, A);
  return fromOklab([Math.min(0.97, L), Math.cos(h) * C, Math.sin(h) * C]);
}
