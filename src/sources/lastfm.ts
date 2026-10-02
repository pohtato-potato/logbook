/* Last.fm: what was playing. Read by username with the owner's own API key (both from the private starter file). */
const API = 'https://ws.audioscrobbler.com/2.0/';
const q = (p: Record<string, string>) => `${API}?${new URLSearchParams({ ...p, format: 'json' })}`;
export const recentUrl = (user: string, key: string, from: number, to: number) => q({ method: 'user.getrecenttracks', user, api_key: key, from: String(from), to: String(to), limit: '200' });
export const weeklyUrl = (user: string, key: string, from: number, to: number) => q({ method: 'user.getweeklytrackchart', user, api_key: key, from: String(from), to: String(to) });
type T = { artist?: { '#text'?: string } | string; name?: string; playcount?: string; '@attr'?: { nowplaying?: string } };
const artistOf = (t: T) => (typeof t.artist === 'string' ? t.artist : t.artist?.['#text'] ?? '');
const list = (v: unknown, a: string): T[] => { const x = v && typeof v === 'object' ? (v as Record<string, { track?: unknown }>)[a]?.track : undefined; return Array.isArray(x) ? (x as T[]) : x && typeof x === 'object' ? [x as T] : []; };
/* Every play in the window, leaving out the track playing right now (it has no time yet). */
export function parseRecent(v: unknown): { artist: string; track: string }[] {
  return list(v, 'recenttracks').filter(t => t['@attr']?.nowplaying !== 'true' && t.name && artistOf(t)).map(t => ({ artist: artistOf(t), track: t.name! }));
}
export function parseWeekly(v: unknown): { artist: string; track: string; plays: number }[] {
  return list(v, 'weeklytrackchart').map(t => ({ artist: artistOf(t), track: t.name ?? '', plays: Number(t.playcount) })).filter(t => t.track && t.artist && Number.isFinite(t.plays) && t.plays > 0);
}
