import { feelingOf, type Family } from '../vocab/vocab';
import { dayKey, timeZone } from '../domain/day';
import { feelingsOf, momentFromLine, peopleOf, removeFeelingToken, tagsOf, type MomentDraft } from '../domain/line';
import type { LogbookDb } from './db';
import { DEFAULT_SETTINGS, type Entry, type EntryData, type EntryKind, type Marks, type Moment, type Settings, type Span } from './types';

export interface Undo { label: string; run: () => Promise<void> }
export class StorageFullError extends Error { constructor() { super('The phone is out of space. Nothing was saved, and your words are still in the box.'); this.name = 'StorageFullError'; } }
const HOUR = 3600_000;
/* Runs a write; a full disk becomes StorageFullError. Dexie transactions roll back, so nothing half-saves. */
export async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try { return await fn(); } catch (e) {
    const name = (e as { name?: string }).name ?? '';
    const inner = (e as { inner?: { name?: string } }).inner?.name ?? '';
    if (name === 'QuotaExceededError' || inner === 'QuotaExceededError') throw new StorageFullError();
    throw e;
  }
}
/* An Undo runs at most once. */
export function once(label: string, fn: () => Promise<unknown>): Undo { let done = false; return { label, run: async () => { if (done) return; done = true; await fn(); } }; }

export async function keepLine(db: LogbookDb, { text, marks, at }: { text: string; marks: Marks; at: Date }, own: Record<string, Family>) {
  const clean = text.trim();
  const day = dayKey(at), t = at.getTime();
  const recent = new Set((await db.moments.where('at').between(t - HOUR, t + 1).toArray()).map(m => m.word));
  const { moment, skipped } = momentFromLine(feelingsOf(clean, own), recent), handles = (await db.people.toArray()).map(p => p.initial);
  return guard(() => db.transaction('rw', db.entries, db.moments, db.tags, async () => {
    const entry: Entry = { day, at: t, tz: timeZone(), kind: 'line', text: clean, marks: { ...marks }, tags: tagsOf(clean), people: peopleOf(clean, handles), writtenAt: Date.now() };
    const entryId = await db.entries.add(entry);
    const made: string[] = [];
    for (const name of entry.tags) if (!(await db.tags.get(name))) { await db.tags.add({ name, created: t }); made.push(name); }
    const momentId = moment ? await db.moments.add({ ...moment, day, at: t, entryId }) : null;
    return { entryId, momentId, skipped, undo: once('Kept', () => db.transaction('rw', db.entries, db.moments, db.tags, async () => {
      await db.entries.delete(entryId); await db.moments.where('entryId').equals(entryId).delete();
      for (const name of made) if (!(await db.entries.where('tags').equals(name).count())) await db.tags.delete(name);
    })) };
  }));
}
export async function keepMoment(db: LogbookDb, d: MomentDraft & { at: Date }) {
  const m: Moment = { word: d.word, family: d.family, strength: d.strength, day: dayKey(d.at), at: d.at.getTime() };
  if (d.second) m.second = d.second;
  if (d.about) m.about = d.about;
  const momentId = await guard(() => db.moments.add(m));
  return { momentId, undo: once(`Kept ${d.word}`, () => db.moments.delete(momentId)) };
}
async function writeOverall(db: LogbookDb, day: string, overall: { word: string; family: Family; strength: number }): Promise<Undo> {
  const before = await db.days.get(day);
  await guard(() => db.days.put({ ...(before ?? { day }), overall: { ...overall, set: true } }));
  return once('The day overall', async () => { if (before) await db.days.put(before); else await db.days.update(day, { overall: undefined }); }); // the row stays: another device may have filled it
}
export const setOverall = writeOverall;
export const confirmOverall = writeOverall;
export async function removeFeelingFromEntry(db: LogbookDb, entryId: number, word: string, own: Record<string, Family> = {}): Promise<Undo> {
  const e = await db.entries.get(entryId); if (!e) return once('Nothing', async () => {});
  const moments = await db.moments.where('entryId').equals(entryId).toArray();
  await guard(() => db.transaction('rw', db.entries, db.moments, async () => {
    await db.entries.update(entryId, { text: removeFeelingToken(e.text, word) });
    for (const m of moments) {
      const words = [m.word, ...(m.about ? m.about.replace(/^then /, '').split(', ') : [])].filter(w => w !== word);
      if (!words.length) { await db.moments.delete(m.id!); continue; }
      const { moment } = momentFromLine(words.map(w => ({ w, family: w === m.word ? m.family : (feelingOf(w, own)?.family ?? m.second ?? m.family) })), new Set());
      const next: Moment = { ...m, word: moment!.word, family: moment!.family };
      delete next.second; delete next.about;
      if (moment!.second) next.second = moment!.second;
      if (moment!.about) next.about = moment!.about;
      await db.moments.put(next);
    }
  }));
  return once(`Removed ${word}`, () => db.transaction('rw', db.entries, db.moments, async () => { await db.entries.put(e); for (const m of moments) await db.moments.put(m); }));
}
export async function removeMoment(db: LogbookDb, momentId: number): Promise<Undo> {
  const m = await db.moments.get(momentId); await guard(() => db.moments.delete(momentId));
  return once(`Removed ${m?.word ?? ''}`, async () => { if (m) await db.moments.put(m); });
}
/* Removing an entry takes back what it added: a place visit, or the span it made. Undo restores all of it. */
export async function removeEntry(db: LogbookDb, entryId: number): Promise<Undo> {
  const e = await db.entries.get(entryId), ms = await db.moments.where('entryId').equals(entryId).toArray();
  const place = e?.data?.kind === 'place' ? await db.places.get(e.data.placeId) : undefined, span = e?.data?.kind === 'span' ? await db.spans.get(e.data.spanId) : undefined;
  await guard(() => db.transaction('rw', [db.entries, db.moments, db.places, db.spans], async () => {
    await db.entries.delete(entryId); await db.moments.where('entryId').equals(entryId).delete();
    if (place) await db.places.update(place.id!, { visits: Math.max(0, place.visits - 1) });
    if (span) await db.spans.delete(span.id!);
  }));
  return once('Removed', () => db.transaction('rw', [db.entries, db.moments, db.places, db.spans], async () => {
    if (e) await db.entries.put(e); for (const m of ms) await db.moments.put(m); if (place) await db.places.put(place); if (span) await db.spans.put(span);
  }));
}
export async function addOwnWord(db: LogbookDb, word: string, family: Family) { await guard(() => db.words.put({ word: word.trim().toLowerCase(), family, created: Date.now() })); }
export async function getSettings(db: LogbookDb): Promise<Settings> { return (await db.settings.get('main')) ?? DEFAULT_SETTINGS; }
export async function saveSettings(db: LogbookDb, patch: Partial<Settings>) { await db.settings.put({ ...(await getSettings(db)), ...patch, id: 'main' }); }

/* Every kind other than a line. Something from before goes on its own date; writtenAt is always now. */
export type EntryDraft = { kind: Exclude<EntryKind, 'line'>; text: string; data: EntryData; marks?: Marks; people?: string[]; at: Date; day?: string };
export async function keepEntry(db: LogbookDb, d: EntryDraft) {
  const t = d.at.getTime(), day = d.kind === 'past' && d.day ? d.day : dayKey(d.at);
  const people = d.data.kind === 'person' ? [...d.data.who] : d.people ?? [];
  const placeId = d.data.kind === 'place' ? d.data.placeId : null;
  const bump = async (by: number) => { if (placeId == null) return; const p = await db.places.get(placeId); if (p) await db.places.update(placeId, { visits: Math.max(0, p.visits + by) }); };
  return guard(() => db.transaction('rw', db.entries, db.places, async () => {
    const entryId = await db.entries.add({ day, at: t, tz: timeZone(), kind: d.kind, text: d.text.trim(), marks: { ...(d.marks ?? {}) }, tags: tagsOf(d.text), people, writtenAt: Date.now(), data: d.data });
    await bump(1);
    return { entryId, undo: once('Kept', () => db.transaction('rw', db.entries, db.places, async () => { await db.entries.delete(entryId); await bump(-1); })) };
  }));
}
/* The same name (ignoring case and spaces at the ends) is the same place. */
export async function addPlace(db: LogbookDb, p: { name: string; lat?: number; lon?: number; first: boolean }): Promise<number> {
  const name = p.name.trim(), same = (await db.places.toArray()).find(x => x.name.toLowerCase() === name.toLowerCase());
  if (same) { if (p.lat != null && same.lat == null) await guard(() => db.places.update(same.id!, { lat: p.lat, lon: p.lon })); return same.id!; }
  const row: { name: string; lat?: number; lon?: number; first: boolean; visits: number } = { name, first: p.first, visits: 0 };
  if (p.lat != null && p.lon != null) { row.lat = p.lat; row.lon = p.lon; }
  return guard(() => db.places.add(row));
}
export async function addSpan(db: LogbookDb, s: Omit<Span, 'id'>): Promise<number> {
  if (s.to < s.from) throw new Error('The span ends before it starts.');
  return guard(() => db.spans.add({ ...s, name: s.name.trim() }));
}
export async function setPhotoOfDay(db: LogbookDb, day: string, photoId: number | null): Promise<Undo> {
  const before = await db.days.get(day), next = { ...(before ?? { day }) };
  if (photoId == null) delete next.potd; else next.potd = photoId;
  await guard(() => db.days.put(next));
  return once('Photo of the day', async () => { if (before) await db.days.put(before); else await db.days.update(day, { potd: undefined }); });
}
export async function setPersonThread(db: LogbookDb, id: string, thread: number) { await guard(() => db.people.update(id, { thread })); }
/* A place and its visit in one write: a new place is created, a known one (same name) gains a visit and, if it had none, the position.
   Undo puts the place back exactly as it was, or removes it if this keep created it. */
export async function keepPlace(db: LogbookDb, p: { name: string; first: boolean; lat?: number; lon?: number; at: Date }) {
  const name = p.name.trim(), t = p.at.getTime();
  return guard(() => db.transaction('rw', db.entries, db.places, async () => {
    const before = (await db.places.toArray()).find(x => x.name.toLowerCase() === name.toLowerCase());
    let placeId: number;
    if (before) { placeId = before.id!; await db.places.put({ ...before, visits: before.visits + 1, ...(before.lat == null && p.lat != null && p.lon != null ? { lat: p.lat, lon: p.lon } : {}) }); }
    else placeId = await db.places.add({ name, first: p.first, visits: 1, ...(p.lat != null && p.lon != null ? { lat: p.lat, lon: p.lon } : {}) });
    const entryId = await db.entries.add({ day: dayKey(p.at), at: t, tz: timeZone(), kind: 'place', text: '', marks: p.first ? { first: true } : {}, tags: [], people: [], writtenAt: Date.now(), data: { kind: 'place', placeId, first: p.first } });
    return { entryId, undo: once('Kept', () => db.transaction('rw', db.entries, db.places, async () => { await db.entries.delete(entryId); if (before) await db.places.put(before); else await db.places.delete(placeId); })) };
  }));
}
/* A span and the entry that marks it, in one write; Undo removes both. */
export async function keepSpan(db: LogbookDb, s: Omit<Span, 'id'>, at: Date) {
  if (s.to < s.from) throw new Error('The span ends before it starts.');
  return guard(() => db.transaction('rw', db.entries, db.spans, async () => {
    const spanId = await db.spans.add({ ...s, name: s.name.trim() });
    const entryId = await db.entries.add({ day: dayKey(at), at: at.getTime(), tz: timeZone(), kind: 'span', text: '', marks: {}, tags: [], people: [], writtenAt: Date.now(), data: { kind: 'span', spanId } });
    return { entryId, undo: once('Kept', () => db.transaction('rw', db.entries, db.spans, async () => { await db.entries.delete(entryId); await db.spans.delete(spanId); })) };
  }));
}
/* This week in a line, kept on the week's Sunday. An empty line removes it. */
export async function setHeadline(db: LogbookDb, sunday: string, text: string): Promise<Undo> {
  const before = await db.days.get(sunday), next = { ...(before ?? { day: sunday }) }, line = text.trim();
  if (line) next.headline = line; else delete next.headline;
  await guard(() => db.days.put(next));
  return once('This week in a line', async () => { if (before) await db.days.put(before); else await db.days.update(sunday, { headline: undefined }); });
}
