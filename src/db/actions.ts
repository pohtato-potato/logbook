import type { Family } from '../vocab/vocab';
import { dayKey, timeZone } from '../domain/day';
import { feelingsOf, momentFromLine, peopleOf, removeFeelingToken, tagsOf, type MomentDraft } from '../domain/line';
import type { LogbookDb } from './db';
import { DEFAULT_SETTINGS, type Entry, type Marks, type Moment, type Settings } from './types';

export interface Undo { label: string; run: () => Promise<void> }
export class StorageFullError extends Error { constructor() { super('The phone is out of space. Nothing was saved, and your words are still in the box.'); this.name = 'StorageFullError'; } }
const HOUR = 3600_000;
/* Runs a write; a full disk becomes StorageFullError. Dexie transactions roll back, so nothing half-saves. */
async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try { return await fn(); } catch (e) {
    const name = (e as { name?: string }).name ?? '';
    const inner = (e as { inner?: { name?: string } }).inner?.name ?? '';
    if (name === 'QuotaExceededError' || inner === 'QuotaExceededError') throw new StorageFullError();
    throw e;
  }
}
/* An Undo runs at most once. */
function once(label: string, fn: () => Promise<unknown>): Undo { let done = false; return { label, run: async () => { if (done) return; done = true; await fn(); } }; }

export async function keepLine(db: LogbookDb, { text, marks, at }: { text: string; marks: Marks; at: Date }, own: Record<string, Family>) {
  const clean = text.trim();
  const day = dayKey(at), t = at.getTime();
  const recent = new Set((await db.moments.where('at').between(t - HOUR, t + 1).toArray()).map(m => m.word));
  const { moment, skipped } = momentFromLine(feelingsOf(clean, own), recent);
  return guard(() => db.transaction('rw', db.entries, db.moments, db.tags, async () => {
    const entry: Entry = { day, at: t, tz: timeZone(), kind: 'line', text: clean, marks: { ...marks }, tags: tagsOf(clean), people: peopleOf(clean), writtenAt: Date.now() };
    const entryId = await db.entries.add(entry);
    for (const name of entry.tags) if (!(await db.tags.get(name))) await db.tags.add({ name, created: t });
    const momentId = moment ? await db.moments.add({ ...moment, day, at: t, entryId }) : null;
    return { entryId, momentId, skipped, undo: once('Kept', () => db.transaction('rw', db.entries, db.moments, async () => { await db.entries.delete(entryId); await db.moments.where('entryId').equals(entryId).delete(); })) };
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
  return once('The day overall', async () => { if (before) await db.days.put(before); else await db.days.delete(day); });
}
export const setOverall = writeOverall;
export const confirmOverall = writeOverall;
export async function removeFeelingFromEntry(db: LogbookDb, entryId: number, word: string): Promise<Undo> {
  const e = await db.entries.get(entryId); if (!e) return once('Nothing', async () => {});
  const moments = await db.moments.where('entryId').equals(entryId).toArray();
  await guard(() => db.transaction('rw', db.entries, db.moments, async () => {
    await db.entries.update(entryId, { text: removeFeelingToken(e.text, word) });
    for (const m of moments) {
      const words = [m.word, ...(m.about ? m.about.replace(/^then /, '').split(', ') : [])].filter(w => w !== word);
      if (!words.length) { await db.moments.delete(m.id!); continue; }
      const { moment } = momentFromLine(words.map(w => ({ w, family: w === m.word ? m.family : (m.second ?? m.family) })), new Set());
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
export async function removeEntry(db: LogbookDb, entryId: number): Promise<Undo> {
  const e = await db.entries.get(entryId), ms = await db.moments.where('entryId').equals(entryId).toArray();
  await guard(() => db.transaction('rw', db.entries, db.moments, async () => { await db.entries.delete(entryId); await db.moments.where('entryId').equals(entryId).delete(); }));
  return once('Removed', () => db.transaction('rw', db.entries, db.moments, async () => { if (e) await db.entries.put(e); for (const m of ms) await db.moments.put(m); }));
}
export async function addOwnWord(db: LogbookDb, word: string, family: Family) { await guard(() => db.words.put({ word: word.trim().toLowerCase(), family, created: Date.now() })); }
export async function getSettings(db: LogbookDb): Promise<Settings> { return (await db.settings.get('main')) ?? DEFAULT_SETTINGS; }
export async function saveSettings(db: LogbookDb, patch: Partial<Settings>) { await db.settings.put({ ...(await getSettings(db)), ...patch, id: 'main' }); }
