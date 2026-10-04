import type { LogbookDb } from './db';
import type { Person } from './types';
import { guard, once, type Undo } from './actions';
import { checkPerson, normHandle, type PersonDraft } from '../domain/people';
import { PERSON_THREADS } from '../domain/colour';

/* Adding, editing and removing people by hand, beside the private starter file. A person's handle (@Ri) is how lines
   mention them, so once a line uses it, it stays: changing it would leave those lines pointing at nobody. */
const plain = (m: string) => Object.assign(new Error(m), { name: 'PlainMessage' });
export const handleUses = (db: LogbookDb, handle: string) => db.entries.where('people').equals(handle).count();
const clean = (d: PersonDraft) => ({ name: d.name.trim(), initial: normHandle(d.handle), ...(d.birthday ? { birthday: d.birthday } : {}) });
export async function addPerson(db: LogbookDb, d: PersonDraft): Promise<{ id: string; undo: Undo }> {
  const all = await db.people.toArray(), bad = checkPerson(d, all); if (bad) throw plain(bad);
  const used = new Set(all.map(p => p.thread % PERSON_THREADS.length)), thread = [...PERSON_THREADS.keys()].find(k => !used.has(k)) ?? all.length % PERSON_THREADS.length;
  const id = 'p-' + Array.from(crypto.getRandomValues(new Uint8Array(6)), b => b.toString(16).padStart(2, '0')).join('');
  await guard(() => db.people.add({ id, thread, ...clean(d) }));
  return { id, undo: once('Added', () => db.people.delete(id)) };
}
export async function updatePerson(db: LogbookDb, id: string, d: PersonDraft): Promise<Undo> {
  const before = await db.people.get(id); if (!before) throw plain('That person isn’t in Logbook any more.');
  const bad = checkPerson(d, (await db.people.toArray()).filter(p => p.id !== id)); if (bad) throw plain(bad);
  const next = clean(d);
  if (next.initial !== before.initial) { const n = await handleUses(db, before.initial); if (n) throw plain(`@${before.initial} is in ${n} ${n === 1 ? 'entry' : 'entries'} already, so it stays.`); }
  const { birthday: _b, ...rest } = before;
  await guard(() => db.people.put({ ...rest, ...next } as Person));
  return once('Saved', () => db.people.put(before));
}
/* Lines that mention them keep their @ letters; they just show as the letters until someone has that handle again. */
export async function removePerson(db: LogbookDb, id: string): Promise<Undo> {
  const before = await db.people.get(id); if (!before) throw plain('That person isn’t in Logbook any more.');
  await guard(() => db.people.delete(id));
  return once('Removed', () => db.people.put(before));
}
