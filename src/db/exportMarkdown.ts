import type { LogbookDb } from './db';
import type { Place, WeekSong } from './types';
import { parsePostcard, type Postcard } from '../sources/shelf';
import { parseDay } from '../domain/day';
import { dayToMarkdown, type DayFiles } from '../domain/markdown';
import { makeZip } from '../domain/zip';
import { loadLookup } from './lookup';

const README = '# Logbook export\n\nOne Markdown file per day, in year and month folders. Photos and voice notes sit in the photos and audio folders, linked from their day. Open them with any text editor, image viewer or music player.\n';
/* Every place, with how often and (if known) where, so the map can be redrawn by anyone later. */
export function placesMarkdown(places: Place[]): string {
  const line = (p: Place) => `- ${p.name}: ${p.visits} ${p.visits === 1 ? 'visit' : 'visits'}${p.first ? ', a first' : ''}${p.lat != null && p.lon != null ? `, at ${p.lat}, ${p.lon}` : ', no position'}`;
  return ['# Places', '', ...[...places].sort((a, b) => b.visits - a.visits).map(line), ''].join('\n');
}
/* Songs of the week, one line a week, newest first. */
export function songsMarkdown(weeks: WeekSong[]): string {
  const line = (w: WeekSong) => `- Week of ${parseDay(w.week).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}: ${w.track ? `${w.track}, ${w.artist} (${w.plays} ${w.plays === 1 ? 'play' : 'plays'})` : 'nothing played'}`;
  return ['# Songs of the week', '', ...[...weeks].sort((a, b) => b.week.localeCompare(a.week)).map(line), ''].join('\n');
}
const folder = (day: string) => `${day.slice(0, 4)}/${day.slice(5, 7)}`;
const audioExt = (type: string) => (type.includes('mp4') || type.includes('m4a') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm');
export async function makeMarkdownZip(db: LogbookDb): Promise<Blob> {
  const [entries, moments, days, photos, cards, songs] = await Promise.all([db.entries.toArray(), db.moments.toArray(), db.days.toArray(), db.photos.toArray(), db.postcards.toArray(), db.songs.toArray()]);
  const postcards = new Map(cards.flatMap(c => { const p = parsePostcard(c.data); return p ? [[p.day, p] as [string, Postcard]] : []; }));
  const lk = await loadLookup(db), bin: { path: string; data: Uint8Array }[] = [], files = new Map<string, DayFiles>();
  const of = (day: string) => { let f = files.get(day); if (!f) files.set(day, (f = { photos: [], audio: new Map(), keepPhotos: new Map() })); return f; };
  const photoPath = new Map<number, string>();
  const byDay = new Map<string, typeof photos>(); photos.forEach(p => byDay.set(p.day, [...(byDay.get(p.day) ?? []), p]));
  for (const [day, list] of byDay) {
    const potd = days.find(d => d.day === day)?.potd;
    for (const [i, p] of [...list].sort((a, b) => a.addedAt - b.addedAt).entries()) {
      const path = `photos/${folder(day)}/${day}-${i + 1}.jpg`; bin.push({ path, data: new Uint8Array(await p.blob.arrayBuffer()) }); of(day).photos.push({ path, potd: p.id === potd }); photoPath.set(p.id!, path);
    }
  }
  for (const e of entries) if (e.data?.kind === 'voice') {
    const path = `audio/${folder(e.day)}/${e.day}-${e.id}.${audioExt(e.data.type)}`; bin.push({ path, data: new Uint8Array(await e.data.audio.arrayBuffer()) }); of(e.day).audio.set(e.id!, path);
  }
  for (const e of entries) if (e.data?.kind === 'keep' && e.data.photoId != null && photoPath.has(e.data.photoId)) of(e.day).keepPhotos!.set(e.id!, photoPath.get(e.data.photoId)!);
  const keys = [...new Set([...entries.map(e => e.day), ...moments.map(m => m.day), ...days.map(d => d.day), ...byDay.keys(), ...postcards.keys()])].sort();
  const md = keys.map(k => ({ path: `${folder(k)}/${k}.md`, data: dayToMarkdown(k, days.find(d => d.day === k), entries.filter(e => e.day === k), moments.filter(m => m.day === k), lk, files.get(k), postcards.get(k)) }));
  return makeZip([{ path: 'README.md', data: README }, { path: 'places.md', data: placesMarkdown(await db.places.toArray()) }, ...(songs.length ? [{ path: 'songs.md', data: songsMarkdown(songs) }] : []), ...md, ...bin]);
}
