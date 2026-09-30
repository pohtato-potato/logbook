import type { LogbookDb } from './db';
import type { Lookup } from '../domain/entryText';

/* Places, spans and people, so any screen can turn an entry into words. */
export async function loadLookup(db: LogbookDb): Promise<Lookup> {
  const [places, spans, people] = await Promise.all([db.places.toArray(), db.spans.toArray(), db.people.toArray()]);
  return { places: new Map(places.map(p => [p.id!, p])), spans: new Map(spans.map(s => [s.id!, s])), people: new Map(people.map(p => [p.initial, p])) };
}
