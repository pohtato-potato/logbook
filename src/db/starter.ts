import type { LogbookDb } from './db';
import { saveSettings } from './actions';

export class StarterError extends Error { constructor(msg: string) { super(msg); this.name = 'StarterError'; } }
export interface Starter { format: 'logbook-starter'; version: 1; people: { id: string; initial: string; name: string; birthday?: string; thread?: number }[]; homes: { name: string; lat: number; lon: number; from: string; to?: string }[]; lastfm?: string[]; googleClientId?: string }

/* The private starter file holds names, homes and keys; it never lives in the repo. Anything wrong is refused before a single write. */
export function parseStarter(text: string): Starter {
  let s: Partial<Starter>;
  try { s = JSON.parse(text); } catch { throw new StarterError('This file isn’t readable. Nothing was changed.'); }
  if (!s || s.format !== 'logbook-starter') throw new StarterError('This isn’t a Logbook starter file. Nothing was changed.');
  if (s.version !== 1) throw new StarterError('This starter file is from a different version of Logbook. Nothing was changed.');
  if (s.people !== undefined && !Array.isArray(s.people)) throw new StarterError('In the starter file, people must be a list. Nothing was changed.');
  if (s.homes !== undefined && !Array.isArray(s.homes)) throw new StarterError('In the starter file, homes must be a list. Nothing was changed.');
  const people = s.people ?? [], homes = s.homes ?? [];
  people.forEach((p, i) => {
    if (!p || typeof p.id !== 'string' || !p.id) throw new StarterError(`In the starter file, person ${i + 1} has no id. Nothing was changed.`);
    if (typeof p.initial !== 'string' || !p.initial.trim()) throw new StarterError(`In the starter file, person ${i + 1} has no initial. Nothing was changed.`);
    if (typeof p.name !== 'string' || !p.name.trim()) throw new StarterError(`In the starter file, person ${i + 1} has no name. Nothing was changed.`);
    if (p.thread !== undefined && typeof p.thread !== 'number') throw new StarterError(`In the starter file, person ${i + 1}’s thread must be a number. Nothing was changed.`);
  });
  homes.forEach((h, i) => { if (!h || !h.name || typeof h.lat !== 'number' || typeof h.lon !== 'number' || !h.from) throw new StarterError(`In the starter file, home ${i + 1} needs a name, lat, lon and from. Nothing was changed.`); });
  return { format: 'logbook-starter', version: 1, people, homes, lastfm: s.lastfm, googleClientId: s.googleClientId };
}
export async function applyStarter(db: LogbookDb, s: Starter): Promise<void> {
  await db.transaction('rw', db.people, db.settings, async () => {
    await db.people.bulkPut(s.people.map((p, i) => ({ id: p.id, initial: p.initial.toUpperCase().slice(0, 1), name: p.name, birthday: p.birthday, thread: p.thread ?? i })));
    await saveSettings(db, { homes: s.homes, starterLoaded: true });
  });
}
