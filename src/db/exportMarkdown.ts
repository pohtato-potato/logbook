import type { LogbookDb } from './db';
import { dayToMarkdown, type DayFiles } from '../domain/markdown';
import { makeZip } from '../domain/zip';
import { loadLookup } from './lookup';

const README = '# Logbook export\n\nOne Markdown file per day, in year and month folders. Photos and voice notes sit in the photos and audio folders, linked from their day. Open them with any text editor, image viewer or music player.\n';
const folder = (day: string) => `${day.slice(0, 4)}/${day.slice(5, 7)}`;
const audioExt = (type: string) => (type.includes('mp4') || type.includes('m4a') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm');
export async function makeMarkdownZip(db: LogbookDb): Promise<Blob> {
  const [entries, moments, days, photos] = await Promise.all([db.entries.toArray(), db.moments.toArray(), db.days.toArray(), db.photos.toArray()]);
  const lk = await loadLookup(db), bin: { path: string; data: Uint8Array }[] = [], files = new Map<string, DayFiles>();
  const of = (day: string) => { let f = files.get(day); if (!f) files.set(day, (f = { photos: [], audio: new Map() })); return f; };
  const byDay = new Map<string, typeof photos>(); photos.forEach(p => byDay.set(p.day, [...(byDay.get(p.day) ?? []), p]));
  for (const [day, list] of byDay) {
    const potd = days.find(d => d.day === day)?.potd;
    for (const [i, p] of [...list].sort((a, b) => a.addedAt - b.addedAt).entries()) {
      const path = `photos/${folder(day)}/${day}-${i + 1}.jpg`; bin.push({ path, data: new Uint8Array(await p.blob.arrayBuffer()) }); of(day).photos.push({ path, potd: p.id === potd });
    }
  }
  for (const e of entries) if (e.data?.kind === 'voice') {
    const path = `audio/${folder(e.day)}/${e.day}-${e.id}.${audioExt(e.data.type)}`; bin.push({ path, data: new Uint8Array(await e.data.audio.arrayBuffer()) }); of(e.day).audio.set(e.id!, path);
  }
  const keys = [...new Set([...entries.map(e => e.day), ...moments.map(m => m.day), ...days.map(d => d.day), ...byDay.keys()])].sort();
  const md = keys.map(k => ({ path: `${folder(k)}/${k}.md`, data: dayToMarkdown(k, days.find(d => d.day === k), entries.filter(e => e.day === k), moments.filter(m => m.day === k), lk, files.get(k)) }));
  return makeZip([{ path: 'README.md', data: README }, ...md, ...bin]);
}
